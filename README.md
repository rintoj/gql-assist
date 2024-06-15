# GQL Assist

GQL Assist is a powerful tool designed to streamline the development of GraphQL APIs in a NestJS
environment. By automatically converting TypeScript classes, resolvers, and enums into their
corresponding GraphQL definitions, GQL Assist significantly reduces the amount of boilerplate code
you need to write.

## Installation

To install GQL Assist, use npm or yarn:

```bash
npm install gql-assist
```

or

```bash
yarn add gql-assist
```

## Features

GQL Assist provides several key functionalities:

- **Model Conversion**: Automatically converts TypeScript classes to NestJS GraphQL Object Types.
- **Resolver Conversion**: Automatically transforms resolver methods to GraphQL resolvers with
  appropriate decorators.
- **Field Resolver Conversion**: Converts methods to GraphQL field resolvers with the necessary
  decorators.
- **Enum Conversion**: Transforms TypeScript enums to GraphQL enums and registers them.

## Usage

```sh
npx gql-assist generate decorator
```

### Models

For GQL Assist to recognize and convert a TypeScript class into a GraphQL ObjectType, it should be
placed in a file with the extension `.model.ts`.

#### Example

Given the following TypeScript class:

```ts
export class User {
  id!: string
  name?: string
  email?: string
  bio?: string
  role?: UserRole
}
```

GQL Assist will convert it to:

```ts
import { Field, ID, ObjectType } from '@nestjs/graphql'

@ObjectType()
export class User {
  @Field(() => ID)
  id!: string

  @Field({ nullable: true })
  name?: string

  @Field({ nullable: true })
  email?: string

  @Field({ nullable: true })
  bio?: string

  @Field(() => UserRole, { nullable: true })
  role?: UserRole
}
```

### Resolvers

For GQL Assist to recognize and convert a resolver method, it should be placed in a file with the
extension `.resolver.ts`.

#### Example

Given the following TypeScript class:

```ts
export class UserResolver {
  user(id: string, context: GQLContext) {
    return null
  }
}
```

GQL Assist will convert it to:

```ts
import { Args, Context, ID, Query, Resolver } from '@nestjs/graphql'

@Resolver()
export class UserResolver {
  @Query()
  user(
    @Args({ name: 'id', type: () => ID })
    id: string,

    @Context()
    context: GQLContext,
  ) {
    return null
  }
}
```

### Field Resolvers

For GQL Assist to recognize and convert a field resolver method, it should be placed in a file with
the extension `.resolver.ts`.

#### Example

Given the following TypeScript class:

```ts
@Resolver(() => User)
export class UserResolver {
  fullName(parent: UserType) {}
}
```

GQL Assist will convert it to:

```ts
import { Parent, ResolveField, Resolver } from '@nestjs/graphql'

@Resolver(() => User)
export class UserResolver implements FieldResolver<User, UserType> {
  @ResolveField()
  fullName(
    @Parent()
    parent: UserType,
  ) {}
}
```

### Enums

For GQL Assist to recognize and convert enums, they should be placed in a file with the extension
`.enum.ts`.

#### Example

Given the following TypeScript enum:

```ts
export enum UserStatus {
  ACTIVE,
  INACTIVE,
}
```

GQL Assist will convert it to:

```ts
import { registerEnumType } from '@nestjs/graphql'

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

registerEnumType(UserStatus, { name: 'UserStatus' })
```

### React Hook

GraphQL Assist can also help you with writing queries for graphql client by converting GraphQL
queries into TypeScript code compatible with `@apollo/client`. With GraphQL Assist, writing GraphQL
queries for Apollo Client becomes easier and less error-prone, allowing you to focus more on
building your application.

```sh
npx gql-assist generate hook
```

#### Example

Given the following GraphQL query:

```ts
import gql from 'graphql-tag'

const query = gql`
  query {
    user {
      name
    }
  }
```

GraphQL Assist will look at the schema and convert it to the following on save:

```ts
import { QueryHookOptions, useQuery } from '@apollo/client'
import gql from 'graphql-tag'

const query = gql`
  query fetchUser($id: ID!) {
    user(id: $id) {
      name
    }
  }
`

export interface RequestType {
  id: string | undefined
}

export interface QueryType {
  user?: UserType
}

export interface UserType {
  name?: string
  __typename?: 'User'
}

export function useUserQuery(
  request: RequestType,
  options?: QueryHookOptions<QueryType, RequestType>,
) {
  return useQuery<QueryType, RequestType>(query, {
    variables: request,
    skip: !request.id,
    ...options,
  })
}
```

## Command: gql-assist

GQL Assist is a powerful tool designed to streamline the development of GraphQL APIs in a NestJS
environment. By automatically converting TypeScript classes, resolvers, and enums into their
corresponding GraphQL definitions, GQL Assist significantly reduces the amount of boilerplate code
you need to write.

```sh

gql-assist   <generate|create> [--help] [--doc] [--version]

COMMANDS

generate    GraphQL Assist converts GraphQL queries, mutations or subscriptions

create      Create a module

COMMON

--help      Show help

--doc       Generate documentation

--version   Show version

```

## gql-assist generate

GraphQL Assist converts GraphQL queries, mutations or subscriptions

```sh

gql-assist generate   <hook|decorator>

COMMANDS

hook        GraphQL Assist converts GraphQL queries into TypeScript code compatible
            with @apollo/client or similar library, making query writing for
            Apollo Client easier and less error-prone.

decorator   Automatically converts TypeScript classes, resolvers, methods,
            and enums to their respective NestJS GraphQL or Type GraphQL counterparts
            with appropriate decorators.

```

> ### gql-assist generate hook
>
> GraphQL Assist converts GraphQL queries into TypeScript code compatible with @apollo/client or
> similar library, making query writing for Apollo Client easier and less error-prone.
>
> ```sh
>
> gql-assist generate hook   [--schema=<string>] [--file=<string>] [--pattern=<string>]
>                            [--ignore=<string>]
>
> OPTIONS
>
> --schema=<string>    Schema file
>
> --file=<string>      The source file to inspect and generate
>
> --pattern=<string>   Pattern to identify the files to process
>
> --ignore=<string>    Folders to ignore
>
> ```
>
> ### gql-assist generate decorator
>
> Automatically converts TypeScript classes, resolvers, methods, and enums to their respective
> NestJS GraphQL or Type GraphQL counterparts with appropriate decorators.
>
> ```sh
>
> gql-assist generate decorator   [--file=<string>] [--pattern=<string>] [--ignore=<string>]
>
> OPTIONS
>
> --file=<string>      The source file to inspect and generate
>
> --pattern=<string>   Pattern to identify the files to process
>
> --ignore=<string>    Folders to ignore
>
> ```

## gql-assist create

Create a module

```sh

gql-assist create   <name>

ARGUMENTS

name        Name of the module

```

## VSCode Extension

For an enhanced development experience, you can install the
[GQL Assist](https://marketplace.visualstudio.com/items?itemName=rintoj.gql-assist) extension from
the Visual Studio Code Marketplace. This extension provides in-editor completions and suggestions,
making it even easier to work with GraphQL and NestJS.

1. Open Visual Studio Code.
2. Go to the Extensions view by clicking on the Extensions icon in the Activity Bar on the side of
   the window or by pressing `Ctrl+Shift+X`.
3. Search for "GQL Assist".
4. Click the Install button to install the extension.
5. Once installed, the extension will provide code completions and suggestions directly within your
   IDE.

## Contributing

We welcome contributions to GQL Assist! If you have any ideas, suggestions, or bug reports, please
open an issue or submit a pull request on our GitHub repository.

## License

GQL Assist is licensed under the MIT License. See the LICENSE file for more information.

---

GQL Assist aims to make your development experience smoother and more efficient by automating the
repetitive tasks involved in setting up a GraphQL server with NestJS. Enjoy coding with less
boilerplate and more focus on your application's core functionality!
