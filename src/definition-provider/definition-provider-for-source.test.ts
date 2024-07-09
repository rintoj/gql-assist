import * as gql from 'graphql'
import { config } from '../config'
import { Position, Range } from '../diff'
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
