import { GQLAssistConfig, config } from '../../config'
import { parseTSFile } from '../../ts/parse-ts'
import { prettify } from '../../ts/prettify'
import { printTS } from '../../ts/print-ts'
import { toParsedOutput } from '../../util/test-util'
import { generateResolver } from './resolver-generator'

async function generate(fileName: string, content: string, initialConfig?: GQLAssistConfig) {
  const sourceFile = parseTSFile(fileName, content)
  const output = await generateResolver(sourceFile, initialConfig ?? config)
  return prettify(printTS(output, undefined, { removeComments: true }))
}

describe('generateResolver', () => {
  test('should convert a variable with return type as function to a method ', async () => {
    const output = await generate(
      'user.resolver.ts',
      `
        class UserResolver { }
      `,
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        import { Resolver } from '@nestjs/graphql'

        @Resolver()
        export class UserResolver {}
      `),
    )
  })

  test('should remove ...args', async () => {
    const output = await generate(
      'user.resolver.ts',
      `
        @Resolver(() => UserModel)
        class UserResolver {
          createdBy: (...args: any[]) => User | Promise<User>
        }
      `,
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        import { Parent, ResolveField, Resolver } from '@nestjs/graphql'

        @Resolver(() => UserModel)
        export class UserResolver {
          @ResolveField()
          createdBy(
            @Parent()
            parent: unknown,
          ) {}
        }
      `),
    )
  })

  test('should generate paginated model', async () => {
    const output = await generate(
      'user.resolver.ts',
      `
        @Resolver(() => UserModel)
        class UserResolver {
          @ResolveField()
          findAll(context, page?: Page): Users { }
        }
      `,
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        import { Args, Context, ResolveField, Resolver } from '@nestjs/graphql'

        @Resolver(() => UserModel)
        export class UserResolver {
          @ResolveField(() => Users)
          findAll(
            @Context()
            context: GQLContext,

            @Args({ name: 'page', type: () => Page, nullable: true })
            page?: Page,
          ): Users {}
        }
      `),
    )
  })

  test('should use the correct model name', async () => {
    const output = await generate(
      'user.resolver.ts',
      `
        @Resolver(() => UserModel)
        class UserResolver {
          createdAt(context): Date | null {

          }
        }
      `,
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        import { Context, Query, Resolver } from '@nestjs/graphql'

        @Resolver(() => UserModel)
        export class UserResolver {
          @Query(() => Date, { nullable: true })
          createdAt(
            @Context()
            context: GQLContext,
          ): Date | null {}
        }
      `),
    )
  })

  test('should use the correct typename name', async () => {
    const output = await generate(
      'user.resolver.ts',
      `
        @Resolver(() => UserModel)
        class UserResolver {
          createdAt(parent: UserAPIType, context): Date | null {

          }
        }
      `,
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        import { Context, Parent, ResolveField, Resolver } from '@nestjs/graphql'

        @Resolver(() => UserModel)
        export class UserResolver implements FieldResolver<UserModel, UserAPIType> {
          @ResolveField(() => Date, { nullable: true })
          createdAt(
            @Parent()
            parent: UserAPIType,

            @Context()
            context: GQLContext,
          ): Date | null {}
        }
      `),
    )
  })

  test('should resolve types from FieldResolver', async () => {
    const output = await generate(
      'user.resolver.ts',
      `
        class UserResolver implements FieldResolver<UserModel, UserAPIType> {
          @ResolveField()
          createdAt(parent): Date {

          }
        }
      `,
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        import { Parent, ResolveField, Resolver } from '@nestjs/graphql'

        @Resolver(() => UserModel)
        export class UserResolver implements FieldResolver<UserModel, UserAPIType> {
          @ResolveField(() => Date)
          createdAt(
            @Parent()
            parent: UserAPIType,
          ): Date {}
        }
      `),
    )
  })

  test('should resolve types from FieldResolver', async () => {
    const output = await generate(
      'user.resolver.ts',
      `
        class UserResolver implements FieldResolver<UserModel, UserAPIType> {
          @Query()
          user(context): User {

          }
        }
      `,
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        import { Context, Query, Resolver } from '@nestjs/graphql'

        @Resolver(() => UserModel)
        export class UserResolver implements FieldResolver<UserModel, UserAPIType> {
          @Query(() => User)
          user(
            @Context()
            context: GQLContext,
          ): User {}
        }
      `),
    )
  })

  test('should add @Args type to each parameter', async () => {
    const output = await generate(
      'user.resolver.ts',
      `
        class UserResolver implements FieldResolver<UserModel, UserAPIType> {
          @Query()
          user(context, id: string): User | null {

          }
        }
      `,
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        import { Args, Context, ID, Query, Resolver } from '@nestjs/graphql'

        @Resolver(() => UserModel)
        export class UserResolver implements FieldResolver<UserModel, UserAPIType> {
          @Query(() => User, { nullable: true })
          user(
            @Context()
            context: GQLContext,

            @Args({ name: 'id', type: () => ID })
            id: string,
          ): User | null {}
        }
      `),
    )
  })

  test('should add @Parent to query or mutation', async () => {
    const output = await generate(
      'user.resolver.ts',
      `
        class UserResolver implements FieldResolver<UserModel, UserAPIType> {
          @Query(() => User)
          user(id, parent, context): User {

          }
        }
      `,
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        import { Args, Context, ID, Parent, Query, Resolver } from '@nestjs/graphql'

        @Resolver(() => UserModel)
        export class UserResolver implements FieldResolver<UserModel, UserAPIType> {
          @Query(() => User)
          user(
            @Args({ name: 'id', type: () => ID })
            id: string,

            @Parent()
            parent: UserAPIType,

            @Context()
            context: GQLContext,
          ): User {}
        }
      `),
    )
  })

  test('should add @Args type with nullability', async () => {
    const output = await generate(
      'user.resolver.ts',
      `
        class UserResolver implements FieldResolver<UserModel, UserAPIType> {
          @Query()
          user(context, id?: string): User | null {

          }
        }
      `,
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        import { Args, Context, ID, Query, Resolver } from '@nestjs/graphql'

        @Resolver(() => UserModel)
        export class UserResolver implements FieldResolver<UserModel, UserAPIType> {
          @Query(() => User, { nullable: true })
          user(
            @Context()
            context: GQLContext,

            @Args({ name: 'id', type: () => ID, nullable: true })
            id?: string,
          ): User | null {}
        }
      `),
    )
  })

  test('should preserve the existing type the @ResolveField() if type is unknown', async () => {
    const output = await generate(
      'user.resolver.ts',
      `
        class UserResolver implements FieldResolver<UserModel, UserAPIType> {
          @ResolveField(() => UserModel, { nullable: true })
          user(context, id?: string) {

          }
        }
      `,
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        import { Args, Context, ID, ResolveField, Resolver } from '@nestjs/graphql'

        @Resolver(() => UserModel)
        export class UserResolver implements FieldResolver<UserModel, UserAPIType> {
          @ResolveField(() => UserModel, { nullable: true })
          user(
            @Context()
            context: GQLContext,

            @Args({ name: 'id', type: () => ID, nullable: true })
            id?: string,
          ) {}
        }
      `),
    )
  })

  test('should replace the existing type the @ResolveField() if type exists', async () => {
    const output = await generate(
      'user.resolver.ts',
      `
        class UserResolver implements FieldResolver<UserModel, UserAPIType> {
          @ResolveField(() => UserModel, { nullable: true })
          user(context, id?: string): User | null {

          }
        }
      `,
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        import { Args, Context, ID, ResolveField, Resolver } from '@nestjs/graphql'

        @Resolver(() => UserModel)
        export class UserResolver implements FieldResolver<UserModel, UserAPIType> {
          @ResolveField(() => User, { nullable: true })
          user(
            @Context()
            context: GQLContext,

            @Args({ name: 'id', type: () => ID, nullable: true })
            id?: string,
          ): User | null {}
        }
      `),
    )
  })

  test('should create mutation function', async () => {
    const output = await generate(
      'user.resolver.ts',
      `
        class UserResolver implements FieldResolver<UserModel, UserAPIType> {
          @Mutation(() => User)
          user(context, userId, parent): User {

          }
        }
      `,
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        import { Args, Context, Mutation, Parent, Resolver } from '@nestjs/graphql'

        @Resolver(() => UserModel)
        export class UserResolver implements FieldResolver<UserModel, UserAPIType> {
          @Mutation(() => User)
          user(
            @Context()
            context: GQLContext,

            @Args('userId')
            userId: string,

            @Parent()
            parent: UserAPIType,
          ): User {}
        }
      `),
    )
  })

  test('should create mutation with nullability', async () => {
    const output = await generate(
      'user.resolver.ts',
      `
        class UserResolver implements FieldResolver<UserModel, UserAPIType> {
          @Mutation()
          createUser(userId?: string): User | null {

          }
        }
      `,
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        import { Args, Mutation, Resolver } from '@nestjs/graphql'

        @Resolver(() => UserModel)
        export class UserResolver implements FieldResolver<UserModel, UserAPIType> {
          @Mutation(() => User, { nullable: true })
          createUser(
            @Args('userId', { nullable: true })
            userId?: string,
          ): User | null {}
        }
      `),
    )
  })

  test('should create query without Promise if not async', async () => {
    const output = await generate(
      'user.resolver.ts',
      `
        class UserResolver implements FieldResolver<UserModel, UserAPIType> {
          @Query()
          user(userId?: string): Promise<User | null> {

          }
        }
      `,
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        import { Args, Query, Resolver } from '@nestjs/graphql'

        @Resolver(() => UserModel)
        export class UserResolver implements FieldResolver<UserModel, UserAPIType> {
          @Query(() => User, { nullable: true })
          user(
            @Args('userId', { nullable: true })
            userId?: string,
          ): User | null {}
        }
      `),
    )
  })

  test('should create query with Promise if async', async () => {
    const output = await generate(
      'user.resolver.ts',
      `
        class UserResolver implements FieldResolver<UserModel, UserAPIType> {
          @Query()
          async user(userId?: string): Promise<User | null> {

          }
        }
      `,
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        import { Args, Query, Resolver } from '@nestjs/graphql'

        @Resolver(() => UserModel)
        export class UserResolver implements FieldResolver<UserModel, UserAPIType> {
          @Query(() => User, { nullable: true })
          async user(
            @Args('userId', { nullable: true })
            userId?: string,
          ): Promise<User | null> {}
        }
      `),
    )
  })

  test('should not generate if not enabled', async () => {
    const output = await generate(
      'user.resolver.ts',
      `
        class UserResolver { }
      `,
      { ...config, resolver: { ...config.resolver, enable: false } },
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        class UserResolver {}
      `),
    )
  })

  test('should not generate if file extension does not match', async () => {
    const output = await generate(
      'user.resolver.ts',
      `
        class UserResolver { }
      `,
      { ...config, resolver: { ...config.resolver, fileExtensions: ['-resolver.ts'] } },
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        class UserResolver {}
      `),
    )
  })

  test('should not generate if file extension does not match default config', async () => {
    const output = await generate(
      'user-resolver.ts',
      `
        class UserResolver { }
      `,
    )
    expect(toParsedOutput(output)).toBe(
      toParsedOutput(`
        class UserResolver {}
      `),
    )
  })
})
