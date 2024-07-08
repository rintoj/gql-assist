import { resolve } from 'path'
import { Position, Range } from '../diff'
import { trimSpaces } from '../util/trim-spaces'
import { provideDefinitionForSchema } from './definition-provider-for-schema'
import { readFileSync } from 'fs-extra'

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
  const foundPosition = await provideDefinitionForSchema(
    schema,
    'schema.gql',
    position,
    resolve(__dirname, 'test', '*.resolver.ts'),
    resolve(__dirname, 'test', '*.model.ts'),
  )
  if (!foundPosition) return ''
  const source = foundPosition.path.startsWith('schema.gql')
    ? schema
    : readFileSync(foundPosition.path, 'utf-8')
  return [
    `# ${[foundPosition.path.replace(__dirname + '/', ''), foundPosition.range.start.line, foundPosition.range.start.character].join(':')}`,
    getAt(source, foundPosition.range),
  ].join('\n')
}

describe('provideDefinitionFromSchema', () => {
  test('should provide return address type', async () => {
    const output = await process(new Position(4, 16))
    expect(output).toEqual(
      trimSpaces(`
        # schema.gql:13:0
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
        # schema.gql:8:0
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
        # schema.gql:28:0
        type Tweet {
          tweetId: ID!
          mentions: [User!]
        }`),
    )
  })

  test('should provide definition tweet type in typescript', async () => {
    const output = await process(new Position(36, 6))
    expect(output).toEqual(
      trimSpaces(`
        # test/tweet.resolver.ts:6:2
          tweet() {`),
    )
  })

  test('should provide definition user.name in typescript', async () => {
    const output = await process(new Position(3, 5))
    expect(output).toEqual(
      trimSpaces(`
        # test/user.model.ts:6:2
          name?: string`),
    )
  })

  test('should provide definition user id in typescript', async () => {
    const output = await process(new Position(2, 3))
    expect(output).toEqual(
      trimSpaces(`
        # test/base.model.ts:5:2
          id!: string`),
    )
  })
})
