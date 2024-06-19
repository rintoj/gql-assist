import { resolve } from 'path'
import { GQLAssistConfig, config } from '../config'
import { loadSchema, parseSchema } from '../generator/hook/graphql-util'
import { parseTSFile } from '../ts/parse-ts'
import { diagnoseReactHook } from './hook-diagnostic'

const schema = loadSchema(resolve(__dirname, 'test', 'twitter-schema.gql'))

async function diagnose(content: string, initialConfig?: GQLAssistConfig) {
  const sourceFile = parseTSFile(
    'use-hook.gql.ts',
    `import gql from 'graphql-tag'
    const query = gql\`${content}\``,
  )
  return diagnoseReactHook(sourceFile, schema, initialConfig ?? config)
}

describe('diagnoseReactHook', () => {
  test('should not generate error if graphql query is empty', async () => {
    const output = await diagnose(``)
    expect(output).toEqual([])
  })

  test('should not generate error if graphql query is valid', async () => {
    const output = await diagnose(`
      query {
        me {
          id
        }
      }
    `)
    expect(output).toEqual([])
  })

  test('should generate error if invalid query', async () => {
    const output = await diagnose(`
      query {
        me {
          id

      }
    `)
    expect(output).toMatchObject([
      {
        code: 'use-hook.gql.ts:8:5',
        message: 'Syntax Error: Expected Name, found <EOF>.',
      },
    ])
  })

  test('should generate error if invalid toplevel keyword', async () => {
    const output = await diagnose(`
      mute {
        me {
          id
        }
      }
    `)
    expect(output).toMatchObject([
      {
        code: 'use-hook.gql.ts:3:7',
        message: 'Syntax Error: Unexpected Name "mute".',
      },
    ])
  })

  test('should generate error invalid query is used', async () => {
    const output = await diagnose(`
      query {
        invalid {
          id
        }
      }
    `)
    expect(output).toMatchObject([
      {
        code: 'use-hook.gql.ts:4:9',
        message: `Query: Property 'invalid' does not exist on type 'type Query'. Available fields are 'me', 'feed', 'user', 'tweetsByUser', 'followers' and 'following'.`,
      },
    ])
  })

  test('should generate error if a field is missing selectors when required', async () => {
    const output = await diagnose(`
      query {
        me
      }
    `)
    expect(output).toMatchObject([
      {
        code: 'use-hook.gql.ts:4:9',
        message: `Query.me: Field 'me' is of 'type User' therefore must have a selection of subfields. Did you mean 'me { ... }'?`,
      },
    ])
  })

  test('should generate error if a field has selectors when it should not', async () => {
    const output = await diagnose(`
      query {
        me {
          id {
            id
          }
        }
      }
    `)
    expect(output).toMatchObject([
      {
        code: 'use-hook.gql.ts:5:11',
        message: `Query.me.id: Field 'id' is of type 'ID' therefore must not have a selection of subfields.`,
      },
    ])
  })
})
