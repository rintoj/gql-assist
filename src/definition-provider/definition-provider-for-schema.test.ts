import { resolve } from 'path'
import { Position, Range } from '../diff'
import { trimSpaces } from '../util/trim-spaces'
import { provideDefinitionForSchema } from './definition-provider-for-schema'

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
`

function getAt(schema: string, range: Range | null) {
  if (!range) return
  const lines = schema.split('\n').slice(range.start.line, range.end.line + 1)
  return lines.join('\n')
}

async function process(position: Position) {
  const positions = await provideDefinitionForSchema(
    schema,
    'schema.gql',
    position,
    resolve(__dirname, 'test', '*.{model,resolver}.ts'),
  )
  return positions
    ?.map(position => [`# ${position.path}`, getAt(schema, position.range)].join('\n'))
    .join('\n\n')
}

describe('provideDefinitionFromSchema', () => {
  test('should provide return address type', async () => {
    const output = await process(new Position(4, 16))
    expect(output).toEqual(
      trimSpaces(`
        # schema.gql
        type Address {
          id: String
          address: String
          city: City
        }`),
    )
  })

  test('should provide user status', async () => {
    const output = await process(new Position(5, 16))
    expect(output).toEqual(
      trimSpaces(`
        # schema.gql
        enum UserStatus {
          ACTIVE,
          DELETED
        }`),
    )
  })

  test('should provide tweet type', async () => {
    const output = await process(new Position(36, 22))
    expect(output).toEqual(
      trimSpaces(`
        # schema.gql
        type Tweet {
          tweetId: ID!
          mentions: [User!]
        }`),
    )
  })

  test('should provide tweet type', async () => {
    const output = await process(new Position(36, 6))
    expect(output).toEqual(
      trimSpaces(`
        # schema.gql
        type Tweet {
          tweetId: ID!
          mentions: [User!]
        }`),
    )
  })
})
