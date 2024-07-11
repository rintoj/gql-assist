import * as gql from 'graphql'
import { config } from '../config'
import { Position, Range } from '../position'
import { parseTSFile } from '../ts'
import { trimSpaces } from '../util/trim-spaces'
import { provideDefinitionForSource } from './definition-provider-for-source'

const schema = `
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

"""
Tweet object
used as primitive type
"""
type Tweet {
  tweetId: ID!
  status: TweetStatus
  mentions: [User!]
}

enum TweetStatus {
  DRAFT
  ACTIVE
}

type Query {
  me: User
  user(id: ID!): User
  tweet(id: ID!): Tweet
}

type Mutation {
  createUser(input: CreateUserInput!): CreateUserResponse
  updateUser(id: ID!, name: String): User
}

type Subscription {
  onUserChange(id: ID!): User
}

input CreateUserInput {
  name: String!
}

type CreateUserResponse {
  user: User!
}
`

function getAt(schema: string, range: Range | null) {
  if (!range) return
  const lines = schema.split('\n').slice(range.start.line, range.end.line + 1)
  return lines.join('\n')
}

async function process(path: string, code: string, position: Position) {
  const location = provideDefinitionForSource(
    parseTSFile(path, trimSpaces(code)),
    position,
    gql.buildSchema(schema),
    'schema.gql',
    config,
  )
  if (!location) return ''
  return [
    `# ${[location.path.replace(__dirname + '/', ''), location.range.start.line, location.range.start.character].join(':')}`,
    getAt(schema ?? '', location.range),
  ].join('\n')
}

describe('provideDefinitionForSource', () => {
  test('should generate a location in schema for graphql query', async () => {
    const code = `
      const query = gql\`
        query tweetQuery($id: ID!) {
          tweet(id: $id)  {
            tweetId
            status
          }
        }
      \`
    `
    const output = await process('user.gql.ts', code, new Position(2, 4))
    expect(output).toEqual(
      trimSpaces(`
        # schema.gql:42:2
          tweet(id: ID!): Tweet`),
    )
  })

  test('should generate a location in schema for field definition', async () => {
    const code = `
      const query = gql\`
        query tweetQuery($id: ID!) {
          tweet(id: $id)  {
            tweetId
            status
          }
        }
      \`
    `
    const output = await process('user.gql.ts', code, new Position(3, 6))
    expect(output).toEqual(
      trimSpaces(`
        # schema.gql:29:2
          tweetId: ID!`),
    )
  })

  test('should generate a location in schema for variable definition', async () => {
    const code = `
      const query = gql\`
        mutation createUserMutation($input: CreateUserInput!) {
          createUser(input: $input)  {
            user {
              id
            }
          }
        }
      \`
    `
    const output = await process('create-user-mutation.gql.ts', code, new Position(1, 50))
    expect(output).toEqual(
      trimSpaces(`
        # schema.gql:54:0
        input CreateUserInput {
          name: String!
        }`),
    )
  })

  test('should generate a location in schema for operation definition', async () => {
    const code = `
      const query = gql\`
        mutation createUserMutation($input: CreateUserInput!) {
          createUser(input: $input)  {
            user {
              id
            }
          }
        }
      \`
    `
    const output = await process('create-user-mutation.gql.ts', code, new Position(1, 3))
    expect(output).toEqual(
      trimSpaces(`
        # schema.gql:45:0
        type Mutation {
          createUser(input: CreateUserInput!): CreateUserResponse
          updateUser(id: ID!, name: String): User
        }`),
    )
  })

  test('should generate a location in schema for a given model name', async () => {
    const code = `
      @ObjectType()
      class User {
        @Field(() => ID)
        id!: string

        @Field(() => String, { nullable: true })
        name?: string
      }

    `
    const output = await process('user.model.ts', code, new Position(1, 6))
    expect(output).toEqual(
      trimSpaces(`
        # schema.gql:1:0
        type User {
          id: ID!
          name: String
          address: Address
          status: UserStatus
        }`),
    )
  })

  test('should generate a location in schema for a given input model', async () => {
    const code = `
      @InputType()
      class CreateUserInput {
        @Field(() => ID)
        id!: string

        @Field(() => String, { nullable: true })
        name?: string
      }

    `
    const output = await process('create-user.input.ts', code, new Position(1, 6))
    expect(output).toEqual(
      trimSpaces(`
        # schema.gql:54:0
        input CreateUserInput {
          name: String!
        }`),
    )
  })

  test('should generate a location in schema for a given response model', async () => {
    const code = `
      @ObjectType()
      class CreateUserResponse {
        @Field()
        user!: User
      }
    `
    const output = await process('create-user.response.ts', code, new Position(1, 6))
    expect(output).toEqual(
      trimSpaces(`
        # schema.gql:58:0
        type CreateUserResponse {
          user: User!
        }`),
    )
  })

  test('should generate a location in schema for a given enum name', async () => {
    const code = `
      export enum TweetStatus {
        DRAFT = 'DRAFT',
        ACTIVE = 'ACTIVE',
      }
    `
    const output = await process('user.enum.ts', code, new Position(0, 12))
    expect(output).toEqual(
      trimSpaces(`
        # schema.gql:34:0
        enum TweetStatus {
          DRAFT
          ACTIVE
        }`),
    )
  })
})
