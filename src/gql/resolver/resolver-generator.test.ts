import { toParsedOutput } from '../../util/test-util'
import { parseTSFile, prettify, printTS } from '../../util/ts-util'
import { generateResolver } from './resolver-generator'

async function generate(fileName: string, content: string) {
  const sourceFile = parseTSFile(fileName, content)
  const output = await generateResolver(sourceFile)
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
        import { Args, Context, Query, Resolver } from '@nestjs/graphql'

        @Resolver(() => UserModel)
        export class UserResolver implements FieldResolver<UserModel, UserAPIType> {
          @Query(() => User, { nullable: true })
          user(
            @Context()
            context: GQLContext,

            @Args('id')
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
        import { Args, Context, Parent, Query, Resolver } from '@nestjs/graphql'

        @Resolver(() => UserModel)
        export class UserResolver implements FieldResolver<UserModel, UserAPIType> {
          @Query(() => User)
          user(
            @Args('id')
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
        import { Args, Context, Query, Resolver } from '@nestjs/graphql'

        @Resolver(() => UserModel)
        export class UserResolver implements FieldResolver<UserModel, UserAPIType> {
          @Query(() => User, { nullable: true })
          user(
            @Context()
            context: GQLContext,

            @Args('id', { nullable: true })
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
          user(context, id, parent): User {

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

            @Args('id')
            id: string,

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
          createUser(id?: string): User | null {

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
            @Args('id', { nullable: true })
            id?: string,
          ): User | null {}
        }
      `),
    )
  })

  test('should create query with Promise', async () => {
    const output = await generate(
      'user.resolver.ts',
      `
        class UserResolver implements FieldResolver<UserModel, UserAPIType> {
          @Query()
          user(id?: string): Promise<User | null> {

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
            @Args('id', { nullable: true })
            id?: string,
          ): Promise<User | null> {}
        }
      `),
    )
  })
})
