import { GQLAssistConfig, config } from '../config'
import { parseSchema } from '../generator/hook/graphql-util'
import { parseTSFile } from '../ts/parse-ts'
import { diagnoseReactHook } from './hook-diagnostic'

const schema = parseSchema(`
  type User {
    id: ID!
    name: String
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

async function diagnose(fileName: string, content: string, initialConfig?: GQLAssistConfig) {
  const sourceFile = parseTSFile(fileName, content)
  return diagnoseReactHook(sourceFile, schema, initialConfig ?? config)
}

describe('diagnoseReactHook', () => {
  test.only('should generate error if invalid top level object is used', async () => {
    const output = await diagnose(
      'user.hook.ts',
      `import gql from 'graphql-tag'

const query = gql\`
  query {
    user {
      id
      test
    }
  }
\`
`,
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
