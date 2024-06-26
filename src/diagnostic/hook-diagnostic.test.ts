import { resolve } from 'path'
import { GQLAssistConfig, config } from '../config'
import { loadSchema } from '../gql'
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
        message: `Cannot query field \"invalid\" on type \"Query\".`,
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
        message: `Field \"me\" of type \"User\" must have a selection of subfields. Did you mean \"me { ... }\"?`,
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
        code: 'use-hook.gql.ts:5:14',
        message: `Field \"id\" must not have a selection since type \"ID!\" has no subfields.`,
      },
    ])
  })

  test('should generate error for union types', async () => {
    const output = await diagnose(`
      query {
        feed {
          items {
            ... on Test {
              id
            }
          }
        }
      }
    `)
    expect(output).toMatchObject([
      {
        code: 'use-hook.gql.ts:6:20',
        message: `Unknown type \"Test\". Did you mean \"Post\" or \"Tweet\"?`,
      },
    ])
  })
})
