import { GQLAssistConfig, config } from '../config'
import { Position } from '../diff'
import { parseSchema } from '../generator/hook/graphql-util'
import { parseTSFile } from '../ts/parse-ts'
import { autoCompleteHook } from './hook-auto-complete'

const schema = parseSchema(`
  type User {
    id: ID!
    name: String
  }

  type Address {
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

`)

async function diagnose(
  fileName: string,
  content: string,
  position: Position,
  initialConfig?: GQLAssistConfig,
) {
  const sourceFile = parseTSFile(fileName, content)
  return autoCompleteHook(sourceFile, position, schema, initialConfig ?? config)
}

describe('diagnoseReactHook', () => {
  test.only('should generate error if invalid top level object is used', async () => {
    /** */
    const output = await diagnose(
      'user.hook.ts',
      `import gql from 'graphql-tag'

const query = gql\`
  query {
    me {
      fullName
    }
    user {
      id
      test
      address {
        city
      }
    }
  }
\`
`,
      new Position(11, 10),
    )
    console.log(JSON.stringify(output, null, 2))
    expect(output).toEqual([
      {
        fileName: 'user.hook.ts',
        range: expect.any(Object),
        severity: 0,
        message: 'Empty query',
        code: expect.any(String),
      },
    ])
  })
})
