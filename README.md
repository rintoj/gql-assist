# gql-assist

Assists in generating models, resolvers, field resolvers, and GraphQL types efficiently.

```sh

gql-assist   <generate> [--help] [--doc] [--version]

COMMANDS

generate

COMMON

--help      Show help

--doc       Generate documentation

--version   Show version

```

## gql-assist generate

```sh

gql-assist generate   <file>

ARGUMENTS

file        The source file to inspect and generate

```

## Configure VSCode

Install [Save and Run](https://marketplace.visualstudio.com/items?itemName=wk-j.save-and-run)
extension and add the following to `<PROJECT_ROOT>/.vscode/settings.json`

```json
{
  "saveAndRun": {
    "commands": [
      {
        "match": ".model.ts",
        "cmd": "gql-assist generate '${file}'",
        "useShortcut": false,
        "silent": true
      },
      {
        "match": ".resolver.ts",
        "cmd": "gql-assist generate '${file}'",
        "useShortcut": false,
        "silent": true
      },
      {
        "match": ".enum.ts",
        "cmd": "gql-assist generate '${file}'",
        "useShortcut": false,
        "silent": true
      },
      {
        "match": ".input.ts",
        "cmd": "gql-assist generate '${file}'",
        "useShortcut": false,
        "silent": true
      }
    ]
  }
}
```
