import { Position, Range } from '../diff'
import { provideDefinitionFromSchema } from './definition-provider-from-schema'

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

function getAt(schema: string, range: Range | null) {
  if (!range) return
  const lines = schema.split('\n').slice(range.start.line, range.end.line + 1)
  return lines.join('\n')
}

describe('provideDefinitionFromSchema', () => {
  test('should provide return address type', async () => {
    const range = provideDefinitionFromSchema(schema, new Position(4, 16))
    const output = getAt(schema, range)
    expect(output).toEqual(
      trimSpaces(`
        type Address {
          id: String
          address: String
          city: City
        }`),
    )
  })

  test('should provide user status', async () => {
    const range = provideDefinitionFromSchema(schema, new Position(5, 16))
    const output = getAt(schema, range)
    expect(output).toEqual(
      trimSpaces(`
        enum UserStatus {
          ACTIVE,
          DELETED
        }`),
    )
  })

  test('should provide tweet type', async () => {
    const range = provideDefinitionFromSchema(schema, new Position(36, 22))
    const output = getAt(schema, range)
    expect(output).toEqual(
      trimSpaces(`
        type Tweet {
          tweetId: ID!
          mentions: [User!]
        }`),
    )
  })
})
