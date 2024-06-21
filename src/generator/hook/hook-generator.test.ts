import { GQLAssistConfig, config } from '../../config'
import { parseTSFile } from '../../ts/parse-ts'
import { prettify } from '../../ts/prettify'
import { printTS } from '../../ts/print-ts'
import { toParsedOutput } from '../../util/test-util'
import { loadSchema } from './graphql-util'
import { generateHook } from './hook-generator'

const schema = loadSchema('test/schema.gql')

async function generate(fileName: string, content: string, inlineConfig?: GQLAssistConfig) {
  const sourceFile = parseTSFile(fileName, content)
  const { sourceFile: output, errors } = await generateHook(
    sourceFile,
    schema,
    inlineConfig ?? config,
  )
  return { hook: await prettify(printTS(output, undefined)), errors }
}

describe('generateHook', () => {
  test('should generate query and its types', async () => {
    const query = `
      import gql from 'graphql-tag'

      const query = gql\`
        query {
          user {
            name
          }
        }
      \`
    `
    const { hook, errors } = await generate('use-query.gql.ts', query)
    expect(toParsedOutput(hook)).toEqual(
      toParsedOutput(`
        import { QueryHookOptions, useQuery } from '@apollo/client'
        import gql from 'graphql-tag'

        const query = gql\`
          query userQuery($id: ID!) {
            user(id: $id) {
              name
            }
          }
        \`

        export interface UserQuery {
          user?: User
					__typename?: 'Query'
        }

        export interface User {
          name?: string
					__typename?: 'User'
        }

        export interface Variables {
          id: string | undefined
        }

        export function useUserQuery(
          variables: Variables,
          options?: QueryHookOptions<UserQuery, Variables>,
        ) {
          return useQuery<UserQuery, Variables>(query, {
            variables,
            skip: !variables.id,
            ...options,
          })
        }
    `),
    )
    expect(errors).toEqual([])
  })

  test('should generate query and its types without gql', async () => {
    const query = `
      const query = \`
        query {
          user {
            name
          }
        }
      \`
    `
    const { hook, errors } = await generate('use-query.gql.ts', query)
    expect(errors).toEqual([])
    expect(toParsedOutput(hook)).toEqual(
      toParsedOutput(`
        import { QueryHookOptions, useQuery } from '@apollo/client'
        import gql from 'graphql-tag'

        const query = gql\`
          query userQuery($id: ID!) {
            user(id: $id) {
              name
            }
          }
        \`

        export interface UserQuery {
          user?: User
					__typename?: 'Query'
        }

        export interface User {
          name?: string
					__typename?: 'User'
        }

        export interface Variables {
          id: string | undefined
        }

        export function useUserQuery(
          variables: Variables,
          options?: QueryHookOptions<UserQuery, Variables>,
        ) {
          return useQuery<UserQuery, Variables>(query, {
            variables,
            skip: !variables.id,
            ...options,
          })
        }
    `),
    )
  })

  test('should preserve the client used', async () => {
    const query = `
      import { QueryHookOptions, useQuery } from '../my-client'
      import gql from 'graphql-tag'

      const query = gql\`
        query {
          user {
            name
          }
        }
      \`
    `
    const { hook, errors } = await generate('use-query.gql.ts', query, {
      ...config,
      reactHook: { ...config.reactHook, library: '../my-client' },
    })
    expect(errors).toEqual([])
    expect(toParsedOutput(hook)).toEqual(
      toParsedOutput(`
        import gql from 'graphql-tag'
        import { QueryHookOptions, useQuery } from '../my-client'

        const query = gql\`
          query userQuery($id: ID!) {
            user(id: $id) {
              name
            }
          }
        \`

        export interface UserQuery {
          user?: User
					__typename?: 'Query'
        }

        export interface User {
          name?: string
					__typename?: 'User'
        }

        export interface Variables {
          id: string | undefined
        }

        export function useUserQuery(
          variables: Variables,
          options?: QueryHookOptions<UserQuery, Variables>,
        ) {
          return useQuery<UserQuery, Variables>(query, {
            variables,
            skip: !variables.id,
            ...options,
          })
        }
    `),
    )
  })

  test('should generate query with custom package and sort imports', async () => {
    const query = `
      import gql from 'graphql-tag'

      const query = gql\`
        query {
          user {
            name
          }
        }
      \`
    `
    const { hook, errors } = await generate('query.gql.ts', query, {
      ...config,
      reactHook: { ...config.reactHook, library: 'y-package' },
    })
    expect(errors).toEqual([])
    expect(toParsedOutput(hook)).toEqual(
      toParsedOutput(`
        import gql from 'graphql-tag'
        import { QueryHookOptions, useQuery } from 'y-package'

        const query = gql\`
          query userQuery($id: ID!) {
            user(id: $id) {
              name
            }
          }
        \`

        export interface UserQuery {
          user?: User
					__typename?: 'Query'
        }

        export interface User {
          name?: string
					__typename?: 'User'
        }

        export interface Variables {
          id: string | undefined
        }

        export function useUserQuery(
          variables: Variables,
          options?: QueryHookOptions<UserQuery, Variables>,
        ) {
          return useQuery<UserQuery, Variables>(query, {
            variables,
            skip: !variables.id,
            ...options,
          })
        }
    `),
    )
  })

  test('should generate query and its types with batched query', async () => {
    const query = `
      import gql from 'graphql-tag'

      const query = gql\`
        query {
          user {
            name
          }
          tweet {
            id
            content
          }
        }
      \`
    `
    const { hook, errors } = await generate('use-query.gql.ts', query)
    expect(errors).toEqual([])
    expect(toParsedOutput(hook)).toEqual(
      toParsedOutput(`
        import { QueryHookOptions, useQuery } from '@apollo/client'
        import gql from 'graphql-tag'

        const query = gql\`
          query userAndTweetQuery($id: ID!, $tweetId: ID!) {
            user(id: $id) {
              name
            }
            tweet(id: $tweetId) {
              id
              content
            }
          }
        \`

        export interface UserAndTweetQuery {
          user?: User
          tweet?: Tweet
					__typename?: 'Query'
        }

        export interface User {
          name?: string
					__typename?: 'User'
        }

        export interface Tweet {
          id: string
          content: string
					__typename?: 'Tweet'
        }

        export interface Variables {
          id: string | undefined
          tweetId: string | undefined
        }

        export function useUserAndTweetQuery(
          variables: Variables,
          options?: QueryHookOptions<UserAndTweetQuery, Variables>,
        ) {
          return useQuery<UserAndTweetQuery, Variables>(query, {
            variables,
            skip: !variables.id || !variables.tweetId,
            ...options,
          })
        }
    `),
    )
  })

  test('should generate query and its types with batched query and multiple inputs', async () => {
    const query = `
      import gql from 'graphql-tag'

      const query = gql\`
        query {
          followers {
            name
          }
        }
      \`
    `
    const { hook, errors } = await generate('use-query.gql.ts', query)
    expect(errors).toEqual([])
    console.log(hook)
    expect(toParsedOutput(hook)).toEqual(
      toParsedOutput(`
        import { QueryHookOptions, useQuery } from '@apollo/client'
        import gql from 'graphql-tag'

        const query = gql\`
          query followersQuery($id: ID!, $limit: Int) {
            followers(id: $id, limit: $limit) {
              name
            }
          }
        \`

        export interface FollowersQuery {
          followers: User[]
					__typename?: 'Query'
        }

        export interface User {
          name?: string
					__typename?: 'User'
        }

        export interface Variables {
          id: string | undefined
          limit?: number | undefined
        }

        export function useFollowersQuery(
          variables: Variables,
          options?: QueryHookOptions<FollowersQuery, Variables>,
        ) {
          return useQuery<FollowersQuery, Variables>(query, {
            variables,
            skip: !variables.id,
            ...options,
          })
        }
    `),
    )
  })

  test.skip('should generate query and its types with enum', async () => {
    const query = `
      import gql from 'graphql-tag'

      const query = gql\`
        query {
          user {
            id
            status
          }
        }
      \`
    `
    const { hook, errors } = await generate('use-query.gql.ts', query)
    console.log(hook)
    expect(errors).toEqual([])
    expect(toParsedOutput(hook)).toEqual(
      toParsedOutput(`
        import { QueryHookOptions, useQuery } from '@apollo/client'
        import gql from 'graphql-tag'

        const query = gql\`
          query user($id: ID!) {
            user(id: $id) {
              id
              status
            }
          }
        \`

        export interface UserQuery {
          user?: User
        }

        export interface User {
					__typename?: 'User'
          id: string
          status?: UserStatus
        }

        export enum UserStatus {
          ACTIVE = 'ACTIVE',
          INACTIVE = 'INACTIVE',
        }

        export interface UserQueryVariables {
          id: string | undefined
        }

        export function useUserQueryVariables(
          request: UserQueryVariables,
          options?: QueryHookOptions<Query, UserQueryVariables>,
        ) {
          return useQuery<Query, UserQueryVariables>(query, {
            variables: request,
            skip: !request.id,
            ...options,
          })
        }
    `),
    )
  })

  test.skip('should generate query with optional request parameter if none of the imports are mandatory', async () => {
    const query = `
      import gql from 'graphql-tag'

      const query = gql\`
        query {
          users {
            id
            status
          }
        }
      \`
    `
    const hook = await generate('use-query.gql.ts', query)
    expect(toParsedOutput(hook)).toEqual(
      toParsedOutput(`import { QueryHookOptions, useQuery } from '@apollo/client'
      import gql from 'graphql-tag'

      const query = gql\`
        query fetchUsers($next: String) {
          users(next: $next) {
            id
            status
          }
        }
      \`

      export interface RequestType {
        next?: string | undefined
      }

      export interface QueryType {
        users: UserType[]
      }

      export interface UserType {
        id: string
        status?: UserStatus
        __typename?: 'User'
      }

      export enum UserStatus {
        ACTIVE = 'ACTIVE',
        INACTIVE = 'INACTIVE',
      }

      export function useUsersQuery(
        request?: RequestType,
        options?: QueryHookOptions<QueryType, RequestType>,
      ) {
        return useQuery<QueryType, RequestType>(query, {
          variables: request,
          ...options,
        })
      }
      `),
    )
  })

  test.skip('should generate query with date', async () => {
    const query = `
      import gql from 'graphql-tag'

      const query = gql\`
        query {
          user {
            id
            createdAt
          }
        }
      \`
    `
    const hook = await generate('use-query.gql.ts', query)
    expect(toParsedOutput(hook)).toEqual(
      toParsedOutput(`
        import { QueryHookOptions, useQuery } from '@apollo/client'
        import gql from 'graphql-tag'

        const query = gql\`
          query fetchUser($id: ID!) {
            user(id: $id) {
              id
              createdAt
            }
          }
        \`

        export interface RequestType {
          id: string | undefined
        }

        export interface QueryType {
          user?: UserType
        }

        export interface UserType {
          id: string
          createdAt?: DateTime
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
    `),
    )
  })

  test.skip('should generate mutation and its types', async () => {
    const query = `
      import gql from 'graphql-tag'

      const mutation = gql\`
        mutation {
          registerUser {
            id
            name
            email
          }
        }
      \`
    `
    const hook = await generate('use-query.gql.ts', query)
    expect(toParsedOutput(hook)).toEqual(
      toParsedOutput(`
        import { MutationHookOptions, useMutation } from '@apollo/client'
        import gql from 'graphql-tag'

        const mutation = gql\`
          mutation registerUser($input: RegisterUserInput!) {
            registerUser(input: $input) {
              id
              name
              email
            }
          }
        \`

        export interface RequestType {
          input: RegisterUserInputType
        }

        export interface RegisterUserInputType {
          name: string
          email: string
					__typename?: 'RegisterUserInput'
        }

        export interface MutationType {
          registerUser: UserType
        }

        export interface UserType {
          id: string
          name?: string
          email?: string
					__typename?: 'User'
        }

        export function useRegisterUserMutation(options?: MutationHookOptions<MutationType, RequestType>) {
          return useMutation<MutationType, RequestType>(mutation, options)
        }
    `),
    )
  })

  test.skip('should generate subscription and its types', async () => {
    const query = `
      import gql from 'graphql-tag'

      const subscription = gql\`
        subscription {
          onUserChange {
            id
            name
          }
        }
      \`
    `
    const hook = await generate('use-query.gql.ts', query)
    expect(toParsedOutput(hook)).toEqual(
      toParsedOutput(`
        import { SubscriptionHookOptions, useSubscription } from '@apollo/client'
        import gql from 'graphql-tag'

        const subscription = gql\`
          subscription subscribeToOnUserChange($id: ID!) {
            onUserChange(id: $id) {
              id
              name
            }
          }
        \`

        export interface RequestType {
          id: string
        }

        export interface SubscriptionType {
          onUserChange: UserType
          __typename?: 'Subscription'
        }

        export interface UserType {
          id: string
          name?: string
          __typename?: 'User'
        }

        export function useOnUserChangeSubscription(
          options?: SubscriptionHookOptions<SubscriptionType, RequestType>,
        ) {
          return useSubscription<SubscriptionType, RequestType>(subscription, options)
        }
    `),
    )
  })

  test.skip('should generate query with shared variable', async () => {
    const query = `
      import gql from 'graphql-tag'

      const query = gql\`
        query fetchTweet($size: ImageSize) {
          tweet {
            id
            author {
              id
              photo {
                url(size: $size)
              }
            }
            mentions {
              id
              photo {
                url(size: $size)
              }
            }
          }
        }
      \`
    `
    const hook = await generate('use-query.gql.ts', query)
    expect(toParsedOutput(hook)).toEqual(
      toParsedOutput(`
        import { QueryHookOptions, useQuery } from '@apollo/client'
        import gql from 'graphql-tag'

        const query = gql\`
          query fetchTweet($id: ID!, $size: ImageSize) {
            tweet(id: $id) {
              id
              author {
                id
                photo {
                  url(size: $size)
                }
              }
              mentions {
                id
                photo {
                  url(size: $size)
                }
              }
            }
          }
        \`

        export interface RequestType {
          id: string | undefined
          size?: ImageSize | undefined
        }

        export enum ImageSize {
          SMALL = 'SMALL',
          NORMAL = 'NORMAL',
          LARGE = 'LARGE',
        }

        export interface QueryType {
          tweet?: TweetType
        }

        export interface TweetType {
          id: string
          author: UserType
          mentions?: UserType[]
          __typename?: 'Tweet'
        }

        export interface UserType {
          id: string
          photo?: ImageType
          __typename?: 'User'
        }

        export interface ImageType {
          url: string
          __typename?: 'Image'
        }

        export function useTweetQuery(
          request: RequestType,
          options?: QueryHookOptions<QueryType, RequestType>,
        ) {
          return useQuery<QueryType, RequestType>(query, {
            variables: request,
            skip: !request.id,
            ...options,
          })
        }
    `),
    )
  })

  test.skip('should generate query with no request type if query has no parameters', async () => {
    const query = `
      import gql from 'graphql-tag'

      const query = gql\`
        query me {
          me {
            id
            name
            email
          }
        }
      \`
    `
    const hook = await generate('use-query.gql.ts', query)
    expect(toParsedOutput(hook)).toEqual(
      toParsedOutput(`
        import { QueryHookOptions, useQuery } from '@apollo/client'
        import gql from 'graphql-tag'

        const query = gql\`
          query me {
            me {
              id
              name
              email
            }
          }
        \`

        export interface QueryType {
          me?: UserType
        }

        export interface UserType {
          id: string
          name?: string
          email?: string
					__typename?: 'User'
        }

        export function useMeQuery(options?: QueryHookOptions<QueryType, never>) {
          return useQuery<QueryType, never>(query, options)
        }
    `),
    )
  })

  test.skip('should generate lazy query with no parameters', async () => {
    const query = `
      import gql from 'graphql-tag'

      const lazyQuery = gql\`
        query me {
          me {
            id
            name
            email
          }
        }
      \`
    `
    const hook = await generate('use-query.gql.ts', query)
    expect(toParsedOutput(hook)).toEqual(
      toParsedOutput(`
        import { LazyQueryHookOptions, useLazyQuery } from '@apollo/client'
        import gql from 'graphql-tag'

        const lazyQuery = gql\`
          query me {
            me {
              id
              name
              email
            }
          }
        \`

        export interface QueryType {
          me?: UserType
        }

        export interface UserType {
          id: string
          name?: string
          email?: string
					__typename?: 'User'
        }

        export function useMeQuery(options?: LazyQueryHookOptions<QueryType, never>) {
          return useLazyQuery<QueryType, never>(lazyQuery, options)
        }
    `),
    )
  })

  test.skip('should generate lazy query and its types', async () => {
    const query = `
      import gql from 'graphql-tag'

      const lazyQuery = gql\`
        query {
          user {
            name
          }
        }
      \`
    `
    const hook = await generate('use-query.gql.ts', query)
    expect(toParsedOutput(hook)).toEqual(
      toParsedOutput(`
        import { LazyQueryHookOptions, useLazyQuery } from '@apollo/client'
        import gql from 'graphql-tag'

        const lazyQuery = gql\`
          query fetchUser($id: ID!) {
            user(id: $id) {
              name
            }
          }
        \`

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
          options?: LazyQueryHookOptions<QueryType, RequestType>,
        ) {
          return useLazyQuery<QueryType, RequestType>(lazyQuery, {
            variables: request,
            ...options,
          })
        }
    `),
    )
  })

  test.skip('should generate query with no request type if query has no parameters', async () => {
    const query = `
      import gql from 'graphql-tag'

      const mutation = gql\`
        mutation {
          signIn {
            id
          }
        }
      \`
    `
    const hook = await generate('use-query.gql.ts', query)
    expect(toParsedOutput(hook)).toEqual(
      toParsedOutput(`
        import { MutationHookOptions, useMutation } from '@apollo/client'
        import gql from 'graphql-tag'

        const mutation = gql\`
          mutation signIn {
            signIn {
              id
            }
          }
        \`

        export interface MutationType {
          signIn: UserType
        }

        export interface UserType {
          id: string
					__typename?: 'User'
        }

        export function useSignInMutation(options?: MutationHookOptions<MutationType, never>) {
          return useMutation<MutationType, never>(mutation, options)
        }
    `),
    )
  })

  test.skip('should generate query with union', async () => {
    const query = `
      import gql from 'graphql-tag'

      const query = gql\`
        query fetchMyNotifications($size: ImageSize) {
          myNotifications {
            ... on FollowNotification {
              id
              user {
                id
                photo {
                  url(size: $size)
                }
              }
            }
            ... on TweetNotification {
              id
              tweet {
                id
                author {
                  id
                  photo {
                    url(size: $size)
                  }
                }
              }
            }
          }
        }
      \`
    `
    const hook = await generate('use-query.gql.ts', query)
    expect(toParsedOutput(hook)).toEqual(
      toParsedOutput(`
        import { QueryHookOptions, useQuery } from '@apollo/client'
        import gql from 'graphql-tag'

        const query = gql\`
          query fetchMyNotifications($size: ImageSize) {
            myNotifications {
              ... on FollowNotification {
                id
                user {
                  id
                  photo {
                    url(size: $size)
                  }
                }
              }
              ... on TweetNotification {
                id
                tweet {
                  id
                  author {
                    id
                    photo {
                      url(size: $size)
                    }
                  }
                }
              }
            }
          }
        \`

        export interface RequestType {
          size?: ImageSize | undefined
        }

        export enum ImageSize {
          SMALL = 'SMALL',
          NORMAL = 'NORMAL',
          LARGE = 'LARGE',
        }

        export interface QueryType {
          myNotifications: NotificationType[]
        }

        export type NotificationType = FollowNotificationType | TweetNotificationType

        export interface FollowNotificationType {
          id: string
          user: UserType
          __typename?: 'FollowNotification'
        }

        export interface UserType {
          id: string
          photo?: ImageType
          __typename?: 'User'
        }

        export interface ImageType {
          url: string
          __typename?: 'Image'
        }

        export interface TweetNotificationType {
          id: string
          tweet: TweetType
          __typename?: 'TweetNotification'
        }

        export interface TweetType {
          id: string
          author: UserType
          __typename?: 'Tweet'
        }

        export function useMyNotificationsQuery(
          request?: RequestType,
          options?: QueryHookOptions<QueryType, RequestType>,
        ) {
          return useQuery<QueryType, RequestType>(query, {
            variables: request,
            ...options,
          })
        }
    `),
    )
  })

  test.skip('should not generate if not enabled', async () => {
    const query = `
      import gql from 'graphql-tag'

      const query = gql\`
        query {
          user {
            name
          }
        }
      \`
    `
    const hook = await generate('use-query.gql.ts', query, {
      ...config,
      reactHook: { ...config.reactHook, enable: false },
    })
    expect(toParsedOutput(hook)).toEqual(
      toParsedOutput(`
      import gql from 'graphql-tag'

      const query = gql\`
        query {
          user {
            name
          }
        }
      \`
    `),
    )
  })

  test.skip('should not generate if files extension does not match', async () => {
    const query = `
      import gql from 'graphql-tag'

      const query = gql\`
        query {
          user {
            name
          }
        }
      \`
    `
    const hook = await generate('use-query.gql.ts', query, {
      ...config,
      reactHook: { ...config.reactHook, fileExtensions: ['user-query.ts'] },
    })
    expect(toParsedOutput(hook)).toEqual(
      toParsedOutput(`
      import gql from 'graphql-tag'

      const query = gql\`
        query {
          user {
            name
          }
        }
      \`
    `),
    )
  })

  test.skip('should not generate if files extension does not match default', async () => {
    const query = `
      import gql from 'graphql-tag'

      const query = gql\`
        query {
          user {
            name
          }
        }
      \`
    `
    const hook = await generate('use-query.ts', query)
    expect(toParsedOutput(hook)).toEqual(
      toParsedOutput(`
      import gql from 'graphql-tag'

      const query = gql\`
        query {
          user {
            name
          }
        }
      \`
    `),
    )
  })
})
