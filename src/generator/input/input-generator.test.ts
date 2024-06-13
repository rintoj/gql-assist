import { config } from '../../config'
import { parseTSFile } from '../../ts/parse-ts'
import { prettify } from '../../ts/prettify'
import { printTS } from '../../ts/print-ts'
import { toParsedOutput } from '../../util/test-util'
import { generateInput } from './input-generator'

async function generate(fileName: string, content: string) {
  const sourceFile = parseTSFile(fileName, content)
  const output = await generateInput(sourceFile)
  return prettify(printTS(output, undefined, { removeComments: true }))
}

describe('generateInput', () => {
  test('should generate a model', async () => {
    const output = await generate(
      'user.input.ts',
      `
        class User {
          id!: string
          name?: string
        }
      `,
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        import { Field, ID, InputType } from '@nestjs/graphql'

        @InputType()
        class User {
          @Field(() => ID)
          id!: string

          @Field({ nullable: true })
          name?: string
        }
      `),
    )
  })

  test('should generate a model with array property', async () => {
    const output = await generate(
      'user.input.ts',
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
        import { Field, ID, InputType } from '@nestjs/graphql'

        @InputType()
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
      'user.input.ts',
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
        import { Field, ID, InputType } from '@nestjs/graphql'

        @InputType()
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

  test('should generate a model if has @InputType decorator', async () => {
    const output = await generate(
      'user.ts',
      `
        @InputType()
        class User {
          id!: string
          name?: string
        }
      `,
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        import { Field, ID, InputType } from '@nestjs/graphql'

        @InputType()
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
        @InputType()
        class User {
          archivedOn?: Date
          joined_on?: Date
        }
      `,
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        import { Field, InputType } from '@nestjs/graphql'

        @InputType()
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
        @InputType()
        class User {
          id!: string
          name: string
          bio?: string
        }
      `,
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        import { Field, ID, InputType } from '@nestjs/graphql'

        @InputType()
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
        @InputType()
        class User {
          id!: string
          name: string
          bio?: string
        }
      `,
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        import { Field, ID, InputType } from '@nestjs/graphql'

        @InputType()
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
    config.nullableByDefault = false
    const output = await generate(
      'user.ts',
      `
        @InputType()
        class User {
          @Field({ nullable: true })
          bio!: string
        }
      `,
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        import { Field, InputType } from '@nestjs/graphql'

        @InputType()
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

        @InputType()
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
        import { Field, ID, InputType } from '@nestjs/graphql'

        @InputType()
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
        @InputType()
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
        import { Field, ID, InputType } from '@nestjs/graphql'

        @InputType({ description: 'Defines a user' })
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

        @InputType({ description: "Defines a user" })
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
        import { Field, ID, InputType } from '@nestjs/graphql'

        @InputType({ description: 'Defines a user' })
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
