import { GQLAssistConfig, config } from '../../config'
import { parseTSFile } from '../../ts/parse-ts'
import { prettify } from '../../ts/prettify'
import { printTS } from '../../ts/print-ts'
import { toParsedOutput } from '../../util/test-util'
import { generateModel } from './model-generator'

async function generate(fileName: string, content: string, initialConfig?: GQLAssistConfig) {
  const sourceFile = parseTSFile(fileName, content)
  const output = await generateModel(sourceFile, initialConfig ?? config)
  return prettify(printTS(output, undefined, { removeComments: true }))
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
      `,
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        import { Field, ID, ObjectType } from '@nestjs/graphql'

        @ObjectType()
        class User {
          @Field(() => ID)
          id!: string

          @Field({ nullable: true })
          name?: string
        }
      `),
    )
  })

  test('should generate a numeric field as Int by default', async () => {
    const output = await generate(
      'user.model.ts',
      `
        class User {
          id!: string
          followers?: number
        }
      `,
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        import { Field, ID, Int, ObjectType } from '@nestjs/graphql'

        @ObjectType()
        class User {
          @Field(() => ID)
          id!: string

          @Field(() => Int, { nullable: true })
          followers?: number
        }
      `),
    )
  })

  test('should respect configured numeric type', async () => {
    const output = await generate(
      'user.model.ts',
      `
        class User {
          id!: string

          @Field(() => Float, { nullable: true })
          followers?: number
        }
      `,
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        import { Field, Float, ID, ObjectType } from '@nestjs/graphql'

        @ObjectType()
        class User {
          @Field(() => ID)
          id!: string

          @Field(() => Float, { nullable: true })
          followers?: number
        }
      `),
    )
  })

  test('should generate a numeric field as Float if configured so', async () => {
    const output = await generate(
      'user.model.ts',
      `
        class User {
          id!: string
          followers?: number
        }
      `,
      { ...config, behaviour: { ...config.behaviour, defaultNumberType: 'Float' } },
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        import { Field, Float, ID, ObjectType } from '@nestjs/graphql'

        @ObjectType()
        class User {
          @Field(() => ID)
          id!: string

          @Field(() => Float, { nullable: true })
          followers?: number
        }
      `),
    )
  })

  test('should respect configured numeric type', async () => {
    const output = await generate(
      'user.model.ts',
      `
        class User {
          id!: string

          @Field(() => Int, { nullable: true })
          followers?: number
        }
      `,
      { ...config, behaviour: { ...config.behaviour, defaultNumberType: 'Float' } },
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        import { Field, ID, Int, ObjectType } from '@nestjs/graphql'

        @ObjectType()
        class User {
          @Field(() => ID)
          id!: string

          @Field(() => Int, { nullable: true })
          followers?: number
        }
      `),
    )
  })

  test('should generate a model with array property', async () => {
    const output = await generate(
      'user.model.ts',
      `
        class User {
          id!: string
          name?: string[]
          addresses?: Address[]
        }
      `,
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        import { Field, ID, ObjectType } from '@nestjs/graphql'

        @ObjectType()
        class User {
          @Field(() => ID)
          id!: string

          @Field(() => [String], { nullable: true })
          name?: string[]

          @Field(() => [Address], { nullable: true })
          addresses?: Address[]
        }
      `),
    )
  })

  test('should generate a model with boolean property', async () => {
    const output = await generate(
      'user.model.ts',
      `
        class User {
          id!: string
          name?: string[]
          isActive?: boolean
        }
      `,
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        import { Field, ID, ObjectType } from '@nestjs/graphql'

        @ObjectType()
        class User {
          @Field(() => ID)
          id!: string

          @Field(() => [String], { nullable: true })
          name?: string[]

          @Field({ nullable: true })
          isActive?: boolean
        }
      `),
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
      `,
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        import { Field, ID, ObjectType } from '@nestjs/graphql'

        @ObjectType()
        class User {
          @Field(() => ID)
          id!: string

          @Field({ nullable: true })
          name?: string
        }
      `),
    )
  })

  test('should generate fields with camel case', async () => {
    const output = await generate(
      'user.ts',
      `
        @ObjectType()
        class User {
          archivedOn?: Date
          joined_on?: Date
        }
      `,
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        import { Field, ObjectType } from '@nestjs/graphql'

        @ObjectType()
        class User {
          @Field(() => Date, { nullable: true })
          archivedOn?: Date

          @Field(() => Date, { nullable: true })
          joinedOn?: Date
        }
      `),
    )
  })

  test('should infer nullability by exclamation', async () => {
    const output = await generate(
      'user.ts',
      `
        @ObjectType()
        class User {
          id!: string
          name: string
          bio?: string
        }
      `,
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        import { Field, ID, ObjectType } from '@nestjs/graphql'

        @ObjectType()
        class User {
          @Field(() => ID)
          id!: string

          @Field({ nullable: true })
          name?: string

          @Field({ nullable: true })
          bio?: string
        }
      `),
    )
  })

  test('should infer nullability by question mark', async () => {
    config.behaviour.nullableByDefault = false
    const output = await generate(
      'user.ts',
      `
        @ObjectType()
        class User {
          id!: string
          name: string
          bio?: string
        }
      `,
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        import { Field, ID, ObjectType } from '@nestjs/graphql'

        @ObjectType()
        class User {
          @Field(() => ID)
          id!: string

          @Field()
          name!: string

          @Field({ nullable: true })
          bio?: string
        }
      `),
    )
  })

  test('should replace nullability always', async () => {
    config.behaviour.nullableByDefault = false
    const output = await generate(
      'user.ts',
      `
        @ObjectType()
        class User {
          @Field({ nullable: true })
          bio!: string
        }
      `,
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        import { Field, ObjectType } from '@nestjs/graphql'

        @ObjectType()
        class User {
          @Field()
          bio!: string
        }
      `),
    )
  })

  test('should organize imports', async () => {
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
      `,
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        import 'reflect-metadata'
        import { Field, ID, ObjectType } from '@nestjs/graphql'

        @ObjectType()
        class User {
          @Field(() => ID)
          id!: string

          @Field({ nullable: true })
          name?: string

          @Field(() => Organization, { nullable: true })
          org?: Organization
        }
      `),
    )
  })

  test('should generate description from comments', async () => {
    const output = await generate(
      'user.ts',
      `
        import 'reflect-metadata'

        /**
         * Defines a user
         */
        @ObjectType()
        class User {
          /**
           * Unique identifier for the User
           */
          id!: string

          /**
           * Name of the user.
           *
           * Expect this to be null
           */
          name?: string
          org?: Organization
        }
      `,
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        import 'reflect-metadata'
        import { Field, ID, ObjectType } from '@nestjs/graphql'

        @ObjectType({ description: 'Defines a user' })
        class User {
          @Field(() => ID, { description: 'Unique identifier for the User' })
          id!: string

          @Field({ nullable: true, description: 'Name of the user.\\n\\nExpect this to be null' })
          name?: string

          @Field(() => Organization, { nullable: true })
          org?: Organization
        }
      `),
    )
  })

  test('should generate description from existing decorator', async () => {
    const output = await generate(
      'user.ts',
      `
        import 'reflect-metadata'

        @ObjectType({ description: "Defines a user" })
        class User {
          @Field(() => ID, { description: "Unique identifier for the User" })
          id!: string

          @Field({ nullable: true, description: "Name of the user.\\n\\nExpect this to be null"  })
          name?: string
          org?: Organization
        }
      `,
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        import 'reflect-metadata'
        import { Field, ID, ObjectType } from '@nestjs/graphql'

        @ObjectType({ description: 'Defines a user' })
        class User {
          @Field(() => ID, { description: 'Unique identifier for the User' })
          id!: string

          @Field({ nullable: true, description: 'Name of the user.\\n\\nExpect this to be null' })
          name?: string

          @Field(() => Organization, { nullable: true })
          org?: Organization
        }
      `),
    )
  })

  test('should not generate if not enabled', async () => {
    const output = await generate(
      'user.model.ts',
      `
        class User {
          id!: string
          name?: string
        }
      `,
      { ...config, model: { ...config.model, enable: false } },
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        class User {
          id!: string
          name?: string
        }
      `),
    )
  })

  test('should not generate if file extension does not match', async () => {
    const output = await generate(
      'user.model.ts',
      `
        class User {
          id!: string
          name?: string
        }
      `,
      { ...config, model: { ...config.model, fileExtensions: ['-model.ts'] } },
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        class User {
          id!: string
          name?: string
        }
      `),
    )
  })

  test('should not generate if file extension does not match default config', async () => {
    const output = await generate(
      'user-model.ts',
      `
        class User {
          id!: string
          name?: string
        }
      `,
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        class User {
          id!: string
          name?: string
        }
      `),
    )
  })

  test('should generate a response model', async () => {
    const output = await generate(
      'user.response.ts',
      `
        class User {
          id!: string
          name?: string
        }
      `,
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        import { Field, ID, ObjectType } from '@nestjs/graphql'

        @ObjectType()
        class User {
          @Field(() => ID)
          id!: string

          @Field({ nullable: true })
          name?: string
        }
      `),
    )
  })

  test('should not generate response if not enabled', async () => {
    const output = await generate(
      'user.response.ts',
      `
        class User {
          id!: string
          name?: string
        }
      `,
      { ...config, response: { ...config.response, enable: false } },
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        class User {
          id!: string
          name?: string
        }
      `),
    )
  })

  test('should not generate response if extension does not match', async () => {
    const output = await generate(
      'user.response.ts',
      `
        class User {
          id!: string
          name?: string
        }
      `,
      { ...config, response: { ...config.response, fileExtensions: ['-response.ts'] } },
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        class User {
          id!: string
          name?: string
        }
      `),
    )
  })

  test('should not generate response if extension does not match default config', async () => {
    const output = await generate(
      'user-response.ts',
      `
        class User {
          id!: string
          name?: string
        }
      `,
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        class User {
          id!: string
          name?: string
        }
      `),
    )
  })
})
