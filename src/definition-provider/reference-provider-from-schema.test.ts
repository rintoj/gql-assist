import { Position, Range } from '../diff'
import { trimSpaces } from '../util/trim-spaces'
import { provideReferenceFromSchema } from './reference-provider-from-schema'

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

  """
  Users who are mentioned in this tweet
  """
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

describe('provideDefinitionFromSchema', () => {
  test('should return all lines that has User in it', async () => {
    const ranges = provideReferenceFromSchema(schema, new Position(1, 5))
    const output = ranges?.map(range => getAt(schema, range)).join('\n\n')
    expect(trimSpaces(output)).toEqual(
      trimSpaces(`
        mentions: [User!]

        me: User

        user(id: ID!): User

        createUser(name: String): User

        updateUser(id: ID!, name: String): User

        onUserChange(id: ID!): User`),
    )
  })
})
