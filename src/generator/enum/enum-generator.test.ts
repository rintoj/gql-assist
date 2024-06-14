import { GQLAssistConfig, config } from '../../config'
import { parseTSFile } from '../../ts/parse-ts'
import { prettify } from '../../ts/prettify'
import { printTS } from '../../ts/print-ts'
import { toParsedOutput } from '../../util/test-util'
import { generateEnum } from './enum-generator'

async function generate(fileName: string, content: string, initialConfig?: GQLAssistConfig) {
  const sourceFile = parseTSFile(fileName, content)
  const output = await generateEnum(sourceFile, initialConfig ?? config)
  return prettify(printTS(output, undefined, { removeComments: true }))
}

describe('generateModel', () => {
  test('should register an enum', async () => {
    const output = await generate(
      'user.enum.ts',
      `
        enum Status {
          ACTIVE = 'ACTIVE',
          DELETED = 'DELETED',
        }
      `,
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        import { registerEnumType } from '@nestjs/graphql'

        enum Status {
          ACTIVE = 'ACTIVE',
          DELETED = 'DELETED',
        }
        registerEnumType(Status, { name: 'Status' })
      `),
    )
  })

  test('should convert type to string type', async () => {
    const output = await generate(
      'user.enum.ts',
      `
        enum Status {
          ACTIVE,
          DELETED,
        }
      `,
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        import { registerEnumType } from '@nestjs/graphql'

        enum Status {
          ACTIVE = 'ACTIVE',
          DELETED = 'DELETED',
        }
        registerEnumType(Status, { name: 'Status' })
      `),
    )
  })

  test('should not register twice', async () => {
    const output = await generate(
      'user.enum.ts',
      `
       import { registerEnumType } from '@nestjs/graphql'

        enum Status {
          ACTIVE = 'ACTIVE',
          DELETED = 'DELETED',
        }
        registerEnumType(Status, { name: 'Status' })
      `,
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        import { registerEnumType } from '@nestjs/graphql'

        enum Status {
          ACTIVE = 'ACTIVE',
          DELETED = 'DELETED',
        }
        registerEnumType(Status, { name: 'Status' })
      `),
    )
  })

  test('should not generate if not enabled', async () => {
    const output = await generate(
      'user.enum.ts',
      `
        enum Status {
          ACTIVE,
          DELETED,
        }
      `,
      { ...config, enum: { ...config.enum, enable: false } },
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        enum Status {
          ACTIVE,
          DELETED,
        }
      `),
    )
  })

  test('should not generate if not extension config is different', async () => {
    const output = await generate(
      'user.enum.ts',
      `
        enum Status {
          ACTIVE,
          DELETED,
        }
      `,
      { ...config, enum: { ...config.enum, fileExtensions: ['user-enum.ts'] } },
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        enum Status {
          ACTIVE,
          DELETED,
        }
      `),
    )
  })

  test('should not generate if file extension does not match', async () => {
    const output = await generate(
      'user.ts',
      `
        enum Status {
          ACTIVE,
          DELETED,
        }
      `,
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        enum Status {
          ACTIVE,
          DELETED,
        }
      `),
    )
  })
})
