import { config } from '../../config'
import { toParsedOutput } from '../../util/test-util'
import { parseTSFile, prettify, printTS } from '../../util/ts-util'
import { generateScalar } from './scalar-generator'

async function generate(fileName: string, content: string) {
  const sourceFile = parseTSFile(fileName, content)
  const output = await generateScalar(sourceFile)
  return prettify(printTS(output, undefined, { removeComments: true }))
}

describe('generateScalar', () => {
  test('should generate a scalar type', async () => {
    const output = await generate(
      'user.scalar.ts',
      `
        class UserID {
          id!: string
          name?: string
        }
      `,
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        import { CustomScalar, Scalar } from '@nestjs/graphql'
        import { Kind, ValueNode } from 'graphql'

        @Scalar('UserID', () => String)
        export class UserID implements CustomScalar<string, string> {
            description = 'UserID'

            parseValue(value: string): string {
                return value
            }

            serialize(value: string): string {
                return value
            }

            parseLiteral(ast: ValueNode): string {
                if (ast.kind === Kind.STRING) {
                    return ast.value
                }
                return null
            }
        }
      `),
    )
  })

  test('should convert comment to description', async () => {
    const output = await generate(
      'user.scalar.ts',
      `
        /**
         * Unique id for a user
         */
        class UserID {
          id!: string
          name?: string
        }
      `,
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        import { CustomScalar, Scalar } from '@nestjs/graphql'
        import { Kind, ValueNode } from 'graphql'

        @Scalar('UserID', () => String)
        export class UserID implements CustomScalar<string, string> {
            description = 'Unique id for a user'

            parseValue(value: string): string {
                return value
            }

            serialize(value: string): string {
                return value
            }

            parseLiteral(ast: ValueNode): string {
                if (ast.kind === Kind.STRING) {
                    return ast.value
                }
                return null
            }
        }
      `),
    )
  })

  test('should preserve existing implementation of description', async () => {
    const output = await generate(
      'user.scalar.ts',
      `
        class UserID {
          description = 'Unique id for a user'
        }
      `,
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        import { CustomScalar, Scalar } from '@nestjs/graphql'
        import { Kind, ValueNode } from 'graphql'

        @Scalar('UserID', () => String)
        export class UserID implements CustomScalar<string, string> {
            description = 'Unique id for a user'

            parseValue(value: string): string {
                return value
            }

            serialize(value: string): string {
                return value
            }

            parseLiteral(ast: ValueNode): string {
                if (ast.kind === Kind.STRING) {
                    return ast.value
                }
                return null
            }
        }
      `),
    )
  })

  test('should preserve existing implementation of parseValue', async () => {
    const output = await generate(
      'user.scalar.ts',
      `
        class UserID {
          parseValue(value: string): string {
            return typeof value === 'string' ? value : ''
          }
        }
      `,
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        import { CustomScalar, Scalar } from '@nestjs/graphql'
        import { Kind, ValueNode } from 'graphql'

        @Scalar('UserID', () => String)
        export class UserID implements CustomScalar<string, string> {
            description = 'UserID'

            parseValue(value: string): string {
                return typeof value === 'string' ? value : ''
            }

            serialize(value: string): string {
                return value
            }

            parseLiteral(ast: ValueNode): string {
                if (ast.kind === Kind.STRING) {
                    return ast.value
                }
                return null
            }
        }
      `),
    )
  })

  test('should preserve existing implementation of serialize', async () => {
    const output = await generate(
      'user.scalar.ts',
      `
        class UserID {
          serialize(value: string): string {
            return typeof value === 'string' ? value : ''
          }
        }
      `,
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        import { CustomScalar, Scalar } from '@nestjs/graphql'
        import { Kind, ValueNode } from 'graphql'

        @Scalar('UserID', () => String)
        export class UserID implements CustomScalar<string, string> {
            description = 'UserID'

            parseValue(value: string): string {
                return value
            }

            serialize(value: string): string {
                return typeof value === 'string' ? value : ''
            }

            parseLiteral(ast: ValueNode): string {
                if (ast.kind === Kind.STRING) {
                    return ast.value
                }
                return null
            }
        }
      `),
    )
  })

  test('should preserve existing implementation of parseLiteral', async () => {
    const output = await generate(
      'user.scalar.ts',
      `
        class UserID {
          parseLiteral(ast: ValueNode): string {
            if (ast.kind === Kind.STRING && typeof ast.value === 'string') {
              return ast.value
            }
            return null
          }
        }
      `,
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        import { CustomScalar, Scalar } from '@nestjs/graphql'
        import { Kind, ValueNode } from 'graphql'

        @Scalar('UserID', () => String)
        export class UserID implements CustomScalar<string, string> {
            description = 'UserID'

            parseValue(value: string): string {
                return value
            }

            serialize(value: string): string {
                return value
            }

            parseLiteral(ast: ValueNode): string {
              if (ast.kind === Kind.STRING && typeof ast.value === 'string') {
                return ast.value
              }
              return null
            }
        }
      `),
    )
  })
})
