import { parse } from 'graphql'
import { extractTypeDefinitions } from './extract-type-def'

describe('extractTypeDefinitions', () => {
  test('should extract type definitions correctly', () => {
    const schema = parse(`
        type User {
            id: ID!
            name: String
            friends: [User]
        }

        type Query {
            user(id: ID!): User
        }
    `)

    const expectedOutput = {
      User: {
        id: { type: 'ID', isArray: false, isRequired: true, isScalar: true },
        name: { type: 'String', isArray: false, isRequired: false, isScalar: true },
        friends: { type: 'User', isArray: true, isRequired: false, isScalar: false },
      },
      Query: {
        user: { type: 'User', isArray: false, isRequired: false, isScalar: false },
      },
    }

    const result = extractTypeDefinitions(schema)
    expect(result).toEqual(expectedOutput)
  })

  test('should handle nested types and non-null lists correctly', () => {
    const schema = parse(`
        type Post {
            id: ID!
            title: String!
            author: User!
            tags: [String!]!
        }

        type User {
            id: ID!
            name: String
        }
      `)

    const expectedOutput = {
      Post: {
        id: { type: 'ID', isArray: false, isRequired: true, isScalar: true },
        title: { type: 'String', isArray: false, isRequired: true, isScalar: true },
        author: { type: 'User', isArray: false, isRequired: true, isScalar: false },
        tags: { type: 'String', isArray: true, isRequired: true, isScalar: true },
      },
      User: {
        id: { type: 'ID', isArray: false, isRequired: true, isScalar: true },
        name: { type: 'String', isArray: false, isRequired: false, isScalar: true },
      },
    }

    const result = extractTypeDefinitions(schema)
    expect(result).toEqual(expectedOutput)
  })

  test('should return an empty object for an empty schema', () => {
    const schema = parse('scalar Date')
    const expectedOutput = {}
    const result = extractTypeDefinitions(schema)
    expect(result).toEqual(expectedOutput)
  })
})
