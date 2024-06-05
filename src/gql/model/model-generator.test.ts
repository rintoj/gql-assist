import { config } from '../../config'
import { toParsedOutput } from '../../util/test-util'
import { parseTSFile, prettify, printTS } from '../../util/ts-util'
import { generateModel } from './model-generator'

async function generate(fileName: string, content: string) {
  const sourceFile = parseTSFile(fileName, content)
  const output = await generateModel(sourceFile)
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
    config.nullableByDefault = false
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
})
