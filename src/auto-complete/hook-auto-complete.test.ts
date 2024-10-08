import * as gql from 'graphql'
import { GQLAssistConfig, config } from '../config'
import { Position } from '../position'
import { parseTSFile } from '../ts/parse-ts'
import { trimSpaces } from '../util/trim-spaces'
import { DEFAULT_SIPPET, autoCompleteHook } from './hook-auto-complete'

const schema = gql.buildSchema(`
  type User {
    id: ID!
    name: String
    address: Address
    status: UserStatus
  }

  enum UserStatus {
    ACTIVE,
    DELETED
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

  type Tweet {
    tweetId: ID!
    mentions: [User!]
  }

  type Query {
    me: User
    user(id: ID!): User
    tweet(id: ID!): Tweet
  }

  type Mutation {
    createUser(name: String): User
    updateUser(id: ID!, name: String): User
  }

  type Subscription {
    onUserChange(id: ID!): User
  }

`)

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
        isSelectable: true,
        isNullable: false,
        insertText: `query ${DEFAULT_SIPPET}`,
        documentation: expect.any(String),
      },
      {
        parentType: 'GraphQL',
        name: 'mutation',
        type: 'Operation',
        isSelectable: true,
        isArray: false,
        isNullable: false,
        insertText: `mutation ${DEFAULT_SIPPET}`,
        documentation: expect.any(String),
      },
      {
        parentType: 'GraphQL',
        name: 'subscription',
        type: 'Operation',
        isArray: false,
        isSelectable: true,
        isNullable: false,
        insertText: `subscription ${DEFAULT_SIPPET}`,
        documentation: expect.any(String),
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
            me { id }
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
        isSelectable: true,
        insertText: `user ${DEFAULT_SIPPET}`,
        documentation: expect.any(String),
      },
      {
        parentType: 'Query',
        name: 'tweet',
        type: 'Tweet',
        isArray: false,
        isNullable: true,
        isSelectable: true,
        insertText: `tweet ${DEFAULT_SIPPET}`,
        documentation: expect.any(String),
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
        isSelectable: true,
        insertText: `me ${DEFAULT_SIPPET}`,
        documentation: expect.any(String),
      },
      {
        parentType: 'Query',
        name: 'user',
        type: 'User',
        isArray: false,
        isSelectable: true,
        isNullable: true,
        insertText: `user ${DEFAULT_SIPPET}`,
        documentation: expect.any(String),
      },
      {
        parentType: 'Query',
        name: 'tweet',
        type: 'Tweet',
        isArray: false,
        isNullable: true,
        isSelectable: true,
        insertText: `tweet ${DEFAULT_SIPPET}`,
        documentation: expect.any(String),
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
        isSelectable: true,
        isArray: false,
        isNullable: true,
        insertText: `createUser ${DEFAULT_SIPPET}`,
        documentation: expect.any(String),
      },
      {
        parentType: 'Mutation',
        name: 'updateUser',
        type: 'User',
        isSelectable: true,
        isArray: false,
        isNullable: true,
        insertText: `updateUser ${DEFAULT_SIPPET}`,
        documentation: expect.any(String),
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
        isSelectable: true,
        isArray: false,
        isNullable: true,
        insertText: `onUserChange ${DEFAULT_SIPPET}`,
        documentation: expect.any(String),
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
        isSelectable: false,
        isArray: false,
        isNullable: false,
        insertText: 'id',
        documentation: expect.any(String),
      },
      {
        parentType: 'User',
        name: 'status',
        type: 'UserStatus',
        isSelectable: false,
        isArray: false,
        isNullable: true,
        insertText: 'status',
        documentation: expect.any(String),
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
        isSelectable: true,
        isNullable: true,
        insertText: `me ${DEFAULT_SIPPET}`,
        documentation: expect.any(String),
      },
      {
        parentType: 'Query',
        name: 'tweet',
        type: 'Tweet',
        isArray: false,
        isNullable: true,
        isSelectable: true,
        insertText: `tweet ${DEFAULT_SIPPET}`,
        documentation: expect.any(String),
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
        isSelectable: false,
        insertText: 'name',
        documentation: expect.any(String),
      },
      {
        parentType: 'User',
        name: 'status',
        type: 'UserStatus',
        isSelectable: false,
        isArray: false,
        isNullable: true,
        insertText: 'status',
        documentation: expect.any(String),
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
      new Position(13, 6),
    )
    expect(output).toEqual([
      {
        parentType: 'Query',
        name: 'tweet',
        type: 'Tweet',
        isArray: false,
        isNullable: true,
        isSelectable: true,
        insertText: `tweet ${DEFAULT_SIPPET}`,
        documentation: expect.any(String),
      },
    ])
  })

  test('should return properties of tweet', async () => {
    const output = await autoComplete(
      'user.hook.ts',
      `
        import gql from 'graphql-tag'

        const query = gql\`
          query {
            tweet {

            }
          }
        \`
      `,
      new Position(5, 5),
    )
    expect(output).toEqual([
      {
        parentType: 'Tweet',
        name: 'tweetId',
        type: 'ID',
        isNullable: false,
        isArray: false,
        isSelectable: false,
        insertText: 'tweetId',
        documentation: expect.any(String),
      },
      {
        parentType: 'Tweet',
        name: 'mentions',
        type: 'User',
        isNullable: true,
        isArray: true,
        isSelectable: true,
        insertText: `mentions ${DEFAULT_SIPPET}`,
        documentation: expect.any(String),
      },
    ])
  })

  test('should generate properties of an array', async () => {
    const output = await autoComplete(
      'user.hook.ts',
      `
        import gql from 'graphql-tag'

        const query = gql\`
          query {
            tweet {
              mentions {
                __typename
              }
            }
          }
        \`
      `,
      new Position(6, 5),
    )
    expect(output).toEqual([
      {
        parentType: 'User',
        name: 'id',
        type: 'ID',
        isNullable: false,
        isArray: false,
        isSelectable: false,
        insertText: 'id',
        documentation: expect.any(String),
      },
      {
        parentType: 'User',
        name: 'name',
        type: 'String',
        isNullable: true,
        isArray: false,
        isSelectable: false,
        insertText: 'name',
        documentation: expect.any(String),
      },
      {
        parentType: 'User',
        name: 'address',
        type: 'Address',
        isNullable: true,
        isArray: false,
        isSelectable: true,
        insertText: `address ${DEFAULT_SIPPET}`,
        documentation: expect.any(String),
      },
      {
        parentType: 'User',
        name: 'status',
        type: 'UserStatus',
        isSelectable: false,
        isArray: false,
        isNullable: true,
        insertText: 'status',
        documentation: expect.any(String),
      },
    ])
  })
})
