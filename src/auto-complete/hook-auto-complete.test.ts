import { GQLAssistConfig, config } from '../config'
import { Position } from '../diff'
import { parseSchema } from '../gql'
import { parseTSFile } from '../ts/parse-ts'
import { autoCompleteHook } from './hook-auto-complete'

const schema = parseSchema(`
  type User {
    id: ID!
    name: String
    address: Address
  }

  type Address {
    id: String
    address: String
    city: City
  }

  type City {
    name: String
    code: String
  }

  type Query {
    me: User
    user(id: ID!): User
  }

  type Mutation {
    createUser(name: String): User
    updateUser(id: ID!, name: String): User
  }

  type Subscription {
    onUserChange(id: ID!): User
  }

`)

function trimSpaces(content: string) {
  const lines = content.split('\n')
  const nonEmptyAt = lines.findIndex(line => line.trim() !== '') ?? ''
  const firstNonEmptyLine = lines[nonEmptyAt]
  const spaces = firstNonEmptyLine.split('').findIndex(i => i !== ' ')
  if (spaces < 1) return content.slice(nonEmptyAt)
  const output = lines.slice(nonEmptyAt).map(line =>
    line.replace(
      new RegExp(
        new Array(spaces)
          .fill(null)
          .map(() => ' ')
          .join(''),
      ),
      '',
    ),
  )
  // console.log(output.map((l, i) => `${i}: ${l}`).join('\n'))
  return output.join('\n')
}

async function autoComplete(
  fileName: string,
  content: string,
  position: Position,
  initialConfig?: GQLAssistConfig,
) {
  const sourceFile = parseTSFile(fileName, trimSpaces(content))
  return autoCompleteHook(sourceFile, position, schema, initialConfig ?? config)
}

describe('autoCompleteHook', () => {
  test('should generate query, mutation or subscription', async () => {
    const output = await autoComplete(
      'user.hook.ts',
      `
        import gql from 'graphql-tag'

        const query = gql\`

        \`
      `,
      new Position(3, 2),
    )
    expect(output).toEqual([
      {
        parentType: 'GraphQL',
        name: 'query',
        type: 'Operation',
        isArray: false,
        isScalar: false,
        isNullable: false,
        insertText: 'query { }',
      },
      {
        parentType: 'GraphQL',
        name: 'mutation',
        type: 'Operation',
        isScalar: false,
        isArray: false,
        isNullable: false,
        insertText: 'mutation { }',
      },
      {
        parentType: 'GraphQL',
        name: 'subscription',
        type: 'Operation',
        isArray: false,
        isScalar: false,
        isNullable: false,
        insertText: 'subscription { }',
      },
    ])
  })

  test('should generate all queries', async () => {
    const output = await autoComplete(
      'user.hook.ts',
      `
        import gql from 'graphql-tag'

        const query = gql\`
          query {
            me { }
          }
        \`
      `,
      new Position(4, 2),
    )
    expect(output).toEqual([
      {
        parentType: 'Query',
        name: 'user',
        type: 'User',
        isArray: false,
        isNullable: true,
        isScalar: false,
        insertText: 'user { }',
      },
    ])
  })

  test('should generate top level query', async () => {
    const output = await autoComplete(
      'user.hook.ts',
      `
        import gql from 'graphql-tag'

        const query = gql\`
          query {

          }
        \`
      `,
      new Position(4, 5),
    )
    expect(output).toEqual([
      {
        parentType: 'Query',
        name: 'me',
        type: 'User',
        isArray: false,
        isNullable: true,
        isScalar: false,
        insertText: 'me { }',
      },
      {
        parentType: 'Query',
        name: 'user',
        type: 'User',
        isArray: false,
        isScalar: false,
        isNullable: true,
        insertText: 'user { }',
      },
    ])
  })

  test('should generate top level mutation', async () => {
    const output = await autoComplete(
      'user.hook.ts',
      `
        import gql from 'graphql-tag'

        const query = gql\`
          mutation {

          }
        \`
      `,
      new Position(4, 5),
    )
    expect(output).toEqual([
      {
        parentType: 'Mutation',
        name: 'createUser',
        type: 'User',
        isScalar: false,
        isArray: false,
        isNullable: true,
        insertText: 'createUser { }',
      },
      {
        parentType: 'Mutation',
        name: 'updateUser',
        type: 'User',
        isScalar: false,
        isArray: false,
        isNullable: true,
        insertText: 'updateUser { }',
      },
    ])
  })

  test('should generate top level subscription', async () => {
    const output = await autoComplete(
      'user.hook.ts',
      `
        import gql from 'graphql-tag'

        const query = gql\`
          subscription {

          }
        \`
      `,
      new Position(4, 5),
    )
    expect(output).toEqual([
      {
        parentType: 'Subscription',
        name: 'onUserChange',
        type: 'User',
        isScalar: false,
        isArray: false,
        isNullable: true,
        insertText: 'onUserChange { }',
      },
    ])
  })

  test('should generate user properties', async () => {
    const output = await autoComplete(
      'user.hook.ts',
      `
        import gql from 'graphql-tag'

        const query = gql\`
          query {
            me {
              name
            }
            user {
              name
              address {
                id
              }
            }
          }
        \`
      `,
      new Position(8, 1),
    )
    expect(output).toEqual([
      {
        parentType: 'User',
        name: 'id',
        type: 'ID',
        isScalar: true,
        isArray: false,
        isNullable: false,
        insertText: 'id',
      },
    ])
  })

  test('should generate query properties', async () => {
    const output = await autoComplete(
      'user.hook.ts',
      `
        import gql from 'graphql-tag'

        const query = gql\`
          query {
            user {
              id
              name
              address {
                id
              }
            }
          }
        \`
      `,
      new Position(4, 9),
    )
    expect(output).toEqual([
      {
        parentType: 'Query',
        name: 'me',
        type: 'User',
        isArray: false,
        isScalar: false,
        isNullable: true,
        insertText: 'me { }',
      },
    ])
  })

  test('should generate user properties right after {', async () => {
    const output = await autoComplete(
      'user.hook.ts',
      `
        import gql from 'graphql-tag'

        const query = gql\`
          query {
            me {
              name
            }
            user {
              id
              address {
                id
              }
            }
          }
        \`
      `,
      new Position(7, 10),
    )
    expect(output).toEqual([
      {
        parentType: 'User',
        name: 'name',
        type: 'String',
        isArray: false,
        isNullable: true,
        isScalar: true,
        insertText: 'name',
      },
    ])
  })

  test('should generate query properties right at }', async () => {
    const output = await autoComplete(
      'user.hook.ts',
      `
        import gql from 'graphql-tag'

        const query = gql\`
          query {
            me {
              name
            }
            user {
              id
              name
              address {
                id
              }
            }
          }
        \`
      `,
      new Position(13, 5),
    )
    expect(output).toEqual([])
  })
})
