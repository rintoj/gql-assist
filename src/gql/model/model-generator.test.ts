import { toParsedOutput } from '../../util/test-util'
import { parseTSFile, prettify, printTS } from '../../util/ts-util'
import { generateModel } from './model-generator'

async function generate(fileName: string, content: string) {
  const sourceFile = parseTSFile(fileName, content)
  const output = await generateModel(sourceFile)
  return prettify(printTS(output))
}

describe('generateModel', () => {
  test('should generate a model', async () => {
    const output = await generate(
      'user.model.ts',
      `
        class User {
          id!: string
          name?: string
        }
      `
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        import { ID } from '@nestjs/graphql'

        @ObjectType()
        class User {
          @Field(() => ID)
          id!: string

          @Field({ nullable: true })
          name?: string
        }
      `)
    )
  })

  test('should generate a model if has @ObjectType decorator', async () => {
    const output = await generate(
      'user.ts',
      `
        @ObjectType()
        class User {
          id!: string
          name?: string
        }
      `
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        import { ID } from '@nestjs/graphql'

        @ObjectType()
        class User {
          @Field(() => ID)
          id!: string

          @Field({ nullable: true })
          name?: string
        }
      `)
    )
  })

  test('should generate a model with reference type', async () => {
    const output = await generate(
      'user.ts',
      `
        import 'reflect-metadata'

        @ObjectType()
        class User {
          id!: string
          name?: string
          org?: Organization
        }
      `
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        import { ID } from '@nestjs/graphql'

        @ObjectType()
        class User {
          @Field(() => ID)
          id!: string

          @Field({ nullable: true })
          name?: string

          @Field(() => Organization, { nullable: true })
          org?: Organization
        }
      `)
    )
  })
})
