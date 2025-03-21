#!/usr/bin/env -S deno run --allow-all

// Using the location of this script file, iterate over all testcases
// in ../tests/ recursively and write them to `connection_testcases.json`.

import { lstatSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { jsonc } from "npm:jsonc";

const DEFAULT_RESULT = {
  "address": [
    "localhost",
    5656,
  ],
  "branch": "__default__",
  "database": "edgedb",
  "password": null,
  "secretKey": null,
  "serverSettings": {},
  "tlsCAData": null,
  "tlsSecurity": "strict",
  "tlsServerName": null,
  "user": "edgedb",
  "waitUntilAvailable": "PT30S",
};

function collectRecursively(base: string, path: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(join(base, path))) {
    if (name.endsWith(".jsonc")) {
      out.push(join(path, name));
    } else if (lstatSync(join(base, join(path, name))).isDirectory()) {
      out.push(...collectRecursively(base, join(path, name)));
    }
  }
  return out;
}

const scriptDir = dirname(new URL(import.meta.url).pathname);

const out: any[] = [];

const tests = join(scriptDir, "..", "tests");
console.log("Reading testcases from", tests);

let dirty = false;
const names = new Set();
const testcaseInputs = new Map<string, string>();

for (const path of collectRecursively(tests, "")) {
  const testcases = jsonc.parse(readFileSync(join(tests, path), "utf8"));
  if (!Array.isArray(testcases)) {
    throw new Error(`Expected array of testcases in ${path}`);
  }
  for (const testcase of testcases) {
    if (typeof testcase.name !== "string") {
      throw new Error(`Expected string testcase.name in ${path}`);
    }

    const VALID_KEYS = [
      "name",
      "opts",
      "result",
      "env",
      "fs",
      "error",
      "warnings",
      "platform",
    ];

    for (const key of Object.keys(testcase)) {
      if (!VALID_KEYS.includes(key)) {
        throw new Error(`Invalid key ${key} in ${path}`);
      }
      if (testcase.result) {
        for (const resultKey of Object.keys(testcase.result)) {
          if (!(resultKey in DEFAULT_RESULT)) {
            throw new Error(`Invalid result key ${resultKey} in ${path}`);
          }
          if (
            JSON.stringify(DEFAULT_RESULT[resultKey]) ===
              JSON.stringify(testcase.result[resultKey])
          ) {
            console.warn(
              `Removing default value ${
                DEFAULT_RESULT[resultKey]
              } from result key ${resultKey} in ${path} for testcase ${testcase.name}`,
            );
            delete testcase.result[resultKey];
            dirty = true;
          }
        }
      }
    }
    if (testcase.env && Object.keys(testcase.env).length === 0) {
      console.warn(
        `Removing empty env object from ${path} for testcase ${testcase.name}`,
      );
      delete testcase.env;
      dirty = true;
    }
    if (testcase.fs && Object.keys(testcase.fs).length === 0) {
      console.warn(
        `Removing empty fs object from ${path} for testcase ${testcase.name}`,
      );
      delete testcase.fs;
      dirty = true;
    }
    if (testcase.opts && Object.keys(testcase.opts).length === 0) {
      console.warn(
        `Removing empty opts object from ${path} for testcase ${testcase.name}`,
      );
      delete testcase.opts;
      dirty = true;
    }

    // Deep clone the testcase to avoid modifying the original
    let outTestCase = JSON.parse(JSON.stringify(testcase));

    // Merge in default values
    if (outTestCase.result) {
      outTestCase.result = { ...DEFAULT_RESULT, ...testcase.result };
    }

    outTestCase.name = path.replace("/", "_").replace(".jsonc", "") + "_" +
      outTestCase.name;

    let canonicalValues = JSON.parse(JSON.stringify(outTestCase));
    delete canonicalValues.name;
    const canonical = toJSONSorted(canonicalValues);
    if (testcaseInputs.has(canonical)) {
      throw Error(
        `Duplicate testcase ${outTestCase.name} previously defined at ${
          testcaseInputs.get(canonical)
        }`,
      );
    }
    testcaseInputs.set(canonical, outTestCase.name);

    out.push(outTestCase);
    if (names.has(outTestCase.name)) {
      throw Error(`Duplicate test name: ${outTestCase.name}`);
    }
    names.add(outTestCase.name);
  }

  if (dirty) {
    // writeFileSync(join(tests, path), JSON.stringify(testcases, sortObjectKeys, 2));
    throw new Error(`Dirty testcase ${path}`);
  }
}

function sortNumberAware(a: string, b: string): number {
  const aMatch = a.match(/^(.+?)_(\d+)$/);
  const bMatch = b.match(/^(.+?)_(\d+)$/);

  if (aMatch && bMatch && aMatch[1] === bMatch[1]) {
    // Same base name, compare numbers
    return parseInt(aMatch[2]) - parseInt(bMatch[2]);
  }

  // Default to string comparison
  return a.localeCompare(b);
}

// Sort by testcase.name, with numeric suffix handling
out.sort((a, b) => sortNumberAware(a.name, b.name));

function sortObjectKeys(key: string, value: any): any {
  if (value instanceof Object && !(value instanceof Array)) {
    return Object.keys(value)
      .sort()
      .reduce((sorted, key) => {
        sorted[key] = value[key];
        return sorted;
      }, {});
  }
  return value;
}

function toJSONSorted(value: any): string {
  return JSON.stringify(value, sortObjectKeys, 2);
}

// Add pseudo-comments to the first and last testcase
const WARNING =
  "/*** WARNING: do not edit this file. This is automatically rebuilt using tools/rebuild.ts ***/";
out[0][" "] = WARNING;
out[out.length - 1]["~"] = WARNING;

writeFileSync(
  join(scriptDir, "..", "connection_testcases.json"),
  toJSONSorted(out) + "\n",
);

console.log("Wrote", out.length, "testcases to", "connection_testcases.json");
