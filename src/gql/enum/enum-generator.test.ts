import { toParsedOutput } from '../../util/test-util'
import { parseTSFile, prettify, printTS } from '../../util/ts-util'
import { generateEnum } from './enum-generator'

async function generate(fileName: string, content: string) {
  const sourceFile = parseTSFile(fileName, content)
  const output = await generateEnum(sourceFile)
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
})
