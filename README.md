# Shared Test Cases for Gel Clients

This repository contains test cases for different Gel client bindings to
implement consistent unit tests for connection parameters parsing, project
handling and so on.
[The documentation](https://docs.geldata.com/reference/reference/connection)
explains the fundamentals.

## `connection_testcases.json`

This is a generated file that combines `tests/**/*.jsonc` files into a single
file.

## `tests/**/*.jsonc`

These files contain test cases in JSONC format.

These are test cases with different scenarios using the client API, and the
corresponding expected parsed connection parameters. The format is a list of
objects, each may contain the following input/output:

### Input - `opts`

This is usually the values passed directly to the client as options, like the
keyword arguments on `gel.create_client(...)` for Python, or direct command
arguments for the CLI. Possible values:

| key                  | value type  | value                                                                                                                                                      |
| -------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `host`               | string      | the host name or IP of the server instance                                                                                                                 |
| `port`               | integer     | the port of the server instance (test cases may contain strings and floats)                                                                                |
| `user`               | string      | database user for authentication                                                                                                                           |
| `password`           | string      | password for authentication                                                                                                                                |
| `secretKey`          | string      | secret key for authentication                                                                                                                              |
| `database`           | string      | the name of the database to use in the server instance                                                                                                     |
| `branch`             | string      | the name of the branch to use in the server instance                                                                                                       |
| `waitUntilAvailable` | string      | max time to wait before server becomes available                                                                                                           |
| `tlsSecurity`        | enum string | one of `strict`, `no_host_verification` and `insecure` (test cases may contain invalid values)                                                             |
| `tlsCA`              | string      | PEM string of the CA certificate to trust                                                                                                                  |
| `tlsCAFile`          | path string | path to a file containing `tlsCA`                                                                                                                          |
| `tlsServerName`      | string      | Server name to expect when performing host verification                                                                                                    |
| `serverSettings`     | object      | additional [connection parameters](https://docs.geldata.com/reference/reference/protocol/messages#ref-protocol-msg-client-handshake) to send to the server |
| `credentials`        | JSON string | decodes to an object with possible keys: `host`, `port`, `user`, `password`, `database`, `tls_ca`, `tls_security`                                          |
| `credentialsFile`    | string      | path to a file containing `credentials`                                                                                                                    |
| `instance`           | string      | name of a Gel instance                                                                                                                                     |
| `dsn`                | string      | Gel DSN                                                                                                                                                    |

Note: some client bindings take a single positional argument that can be either
`dsn` or `instance`, depending on the format.

Note: `database` and `branch` are old and new way of referring to the same
concept. They both exist for compatibility reasons during the deprecation period
of `database`. They are generally mutually exclusive and must not be used at the
same time.

### Input - `env`

Environment variables present at the time of connecting. Possible values:

| name                       | value                                               |
| -------------------------- | --------------------------------------------------- |
| `GEL_HOST`                 | same as `host` above                                |
| `GEL_PORT`                 | same as `port` above                                |
| `GEL_USER`                 | same as `user` above                                |
| `GEL_PASSWORD`             | same as `password` above                            |
| `GEL_SECRET_KEY`           | same as `secretKey` above                           |
| `EDGEDB_DATABASE`          | same as `database` above                            |
| `GEL_BRANCH`               | same as `branch` above                              |
| `GEL_WAIT_UNTIL_AVAILABLE` | same as `waitUntilAvailable` above                  |
| `GEL_CLIENT_TLS_SECURITY`  | same as `tlsSecurity` above                         |
| `GEL_TLS_CA`               | same as `tlsCA` above                               |
| `GEL_TLS_CA_FILE`          | same as `tlsCAFile` above                           |
| `GEL_TLS_SERVER_NAME`      | same as `tlsServerName` above                       |
| `EDGEDB_CREDENTIALS_FILE`  | same as `credentialsFile` above                     |
| `GEL_INSTANCE`             | same as `instance` above                            |
| `GEL_DSN`                  | same as `dsn` above                                 |
| `GEL_CLIENT_SECURITY`      | one of `default`, `strict`, `insecure_dev_mode`     |
| `GEL_CLOUD_PROFILE`        | the cloud profile name to use                       |
| any other name             | DSN query may reference these environment variables |

### Input - `fs`

If `fs` is present, the test code should mock up the file system accordingly.
Possible keys:

- `cwd` - path to the current working directory as a string to run the test
  case.
- `homedir` - path to the home directory of the OS user as a string.
- `files` - a mapping of full path of files to their corresponding content.
  - The key is a full path to the file, while the value is the content string of
    that file.
  - Project stash directory is a special case where there is a `${HASH}`
    placeholder in the key. The test code should replace `${HASH}` with
    hexadecimal SHA-1 of the full path to the project directory specified below.
    The key represents a directory that contains 2 files represented by the
    value in the form of an object:
    - `instance-name` - contains only the name of the instance in the file
      content
    - `cloud-profile` - optionally contains only the name of the cloud profile
      in the file content
    - `project-path` - a symlink pointing to the full path to the project
      directory in the value

### Input - `platform`

Value can be one of `macos` or `windows`, specifies the OS to run this test
case. This is only useful when `fs` is present.

If `platform` is absent while `fs` is present, the OS should be Linux.

### Output - `result`

Expected result of parsed connection parameters as an object, containing:

| key                  | value type            | value                                                                                                                                                      |
| -------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `address`            | list[string, integer] | the address of the server instance [host, port]                                                                                                            |
| `user`               | string                | database user for authentication                                                                                                                           |
| `password`           | string or `null`      | optional password for authentication                                                                                                                       |
| `secretKey`          | string or `null`      | optional secret key for authentication                                                                                                                     |
| `database`           | string                | the name of the database to use in the server instance (actually used in ver <= 5.x)                                                                       |
| `branch`             | string                | the name of the branch to use in the server instance (for future compatibility)                                                                            |
| `waitUntilAvailable` | string                | ISO 8601 max time to wait before server becomes available                                                                                                  |
| `tlsSecurity`        | enum string           | one of `strict`, `no_host_verification` and `insecure`                                                                                                     |
| `tlsCAData`          | string or `null`      | optional PEM string of the CA certificate to trust                                                                                                         |
| `tlsServerName`      | string or `null`      | optional server name to expect when performing host verification                                                                                           |
| `serverSettings`     | object                | additional [connection parameters](https://docs.geldata.com/reference/reference/protocol/messages#ref-protocol-msg-client-handshake) to send to the server |

### Output - `error`

Expected error, value is currently an object with a single key `type`. The value
of `type` is an idendifier-like string indicating the actual expected error, the
test code should map this identifier to an actual error type or message.

`result` and `error` are mutually exclusive.

### Output - `warning`

A list of identifier-like strings that this test case should emit.
