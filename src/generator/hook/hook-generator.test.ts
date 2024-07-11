import { GQLAssistConfig, config } from '../../config'
import { loadSchema } from '../../gql'
import { parseTSFile } from '../../ts/parse-ts'
import { prettify } from '../../ts/prettify'
import { printTS } from '../../ts/print-ts'
import { toParsedOutput } from '../../util/test-util'
import { generateHookWithErrors } from './hook-generator'

const schema = loadSchema('test/schema.gql')

function toQueryJS(content: string) {
  return `
    import gql from 'graphql-tag'
    const query = gql\`
      ${content}
    \`
  `
}

async function generate(fileName: string, content: string, inlineConfig?: GQLAssistConfig) {
  const sourceFile = parseTSFile(fileName, content)
  const { sourceFile: output, errors } = await generateHookWithErrors(
    sourceFile,
    schema,
    inlineConfig ?? config,
  )
  return { hook: await prettify(printTS(output, undefined)), errors }
}

describe('generateHook', () => {
  test('should fix argument for a simple query', async () => {
    const query = toQueryJS(`
      query getUser{
        user {
          id
          name
        }
      }
    `)
    const { hook, errors } = await generate('query.gql.ts', query)
    expect(errors).toEqual([])
    expect(toParsedOutput(hook)).toEqual(
      toParsedOutput(`
        import { QueryHookOptions, useQuery } from '@apollo/client'
        import gql from 'graphql-tag'

        const query = gql\`
          query getUserQuery($id: ID!) {
            user(id: $id) {
              id
              name
            }
          }
        \`

        export interface GetUserQuery {
          user?: User
          __typename?: 'Query'
        }

        export interface User {
          id: string
          name?: string
          __typename?: 'User'
        }

        export interface Variables {
          id: string | undefined
        }

        export function useGetUserQuery(
          variables: Variables,
          options?: QueryHookOptions<GetUserQuery, Variables>,
        ) {
          return useQuery<GetUserQuery, Variables>(query, {
            variables,
            skip: !variables.id,
            ...options,
          })
        }
      `),
    )
  })

  test('should fix more than one argument for a simple query', async () => {
    const query = toQueryJS(`
      query {
        followers {
          id
          name
        }
      }
    `)
    const { hook, errors } = await generate('query.gql.ts', query)
    expect(errors).toEqual([])
    expect(toParsedOutput(hook)).toEqual(
      toParsedOutput(`
        import { QueryHookOptions, useQuery } from '@apollo/client'
        import gql from 'graphql-tag'

        const query = gql\`
          query followersQuery($id: ID!, $limit: Int) {
            followers(id: $id, limit: $limit) {
              id
              name
            }
          }
        \`

        export interface FollowersQuery {
          followers: User[]
          __typename?: 'Query'
        }

        export interface User {
          id: string
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

  test('should fix more than one argument for a complex query', async () => {
    const query = toQueryJS(`
      query {
        user {
          name
          followers {
            id
            name
          }
        }
      }
    `)

    const { hook, errors } = await generate('query.gql.ts', query)
    expect(errors).toEqual([])
    expect(toParsedOutput(hook)).toEqual(
      toParsedOutput(`
        import { QueryHookOptions, useQuery } from '@apollo/client'
        import gql from 'graphql-tag'

        const query = gql\`
          query userQuery($id: ID!, $limit: Int) {
            user(id: $id) {
              name
              followers(limit: $limit) {
                id
                name
              }
            }
          }
        \`

        export interface UserQuery {
          user?: User
          __typename?: 'Query'
        }

        export interface User {
          name?: string
          followers: UserFollowers[]
          __typename?: 'User'
        }

        export interface UserFollowers {
          id: string
          name?: string
          __typename?: 'User'
        }

        export interface Variables {
          id: string | undefined
          limit?: number | undefined
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

  test('should fix more than one argument for a complex query with 3 level deep', async () => {
    const query = toQueryJS(`
      query {
        user {
          name
          followers {
            id
            name
            followers {
              id
              name
            }
          }
        }
      }
    `)

    const { hook, errors } = await generate('query.gql.ts', query)
    expect(errors).toEqual([])
    expect(toParsedOutput(hook)).toEqual(
      toParsedOutput(`
        import { QueryHookOptions, useQuery } from '@apollo/client'
        import gql from 'graphql-tag'

        const query = gql\`
          query userQuery($id: ID!, $limit: Int, $followerLimit: Int) {
            user(id: $id) {
              name
              followers(limit: $limit) {
                id
                name
                followers(limit: $followerLimit) {
                  id
                  name
                }
              }
            }
          }
        \`

        export interface UserQuery {
          user?: User
          __typename?: 'Query'
        }

        export interface User {
          name?: string
          followers: UserFollowers[]
          __typename?: 'User'
        }

        export interface UserFollowers {
          id: string
          name?: string
          followers: UserFollower1[]
          __typename?: 'User'
        }

        export interface UserFollower1 {
          id: string
          name?: string
          __typename?: 'User'
        }

        export interface Variables {
          id: string | undefined
          limit?: number | undefined
          followerLimit?: number | undefined
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

  test('should fix more than one argument for a complex query with variables with same name', async () => {
    const query = toQueryJS(`
      query {
        user {
          name
          follower {
            id
            name
          }
        }
      }
    `)
    const { hook, errors } = await generate('query.gql.ts', query)
    expect(errors).toEqual([])
    expect(toParsedOutput(hook)).toEqual(
      toParsedOutput(`
        import { QueryHookOptions, useQuery } from '@apollo/client'
        import gql from 'graphql-tag'

        const query = gql\`
          query userQuery($id: ID!, $followerId: ID!) {
            user(id: $id) {
              name
              follower(id: $followerId) {
                id
                name
              }
            }
          }
        \`

        export interface UserQuery {
          user?: User
          __typename?: 'Query'
        }

        export interface User {
          name?: string
          follower?: UserFollower
          __typename?: 'User'
        }

        export interface UserFollower {
          id: string
          name?: string
          __typename?: 'User'
        }

        export interface Variables {
          id: string | undefined
          followerId: string | undefined
        }

        export function useUserQuery(
          variables: Variables,
          options?: QueryHookOptions<UserQuery, Variables>,
        ) {
          return useQuery<UserQuery, Variables>(query, {
            variables,
            skip: !variables.id || !variables.followerId,
            ...options,
          })
        }
      `),
    )
  })

  test('should fix more than one argument for 3 level query with variables with same name', async () => {
    const query = toQueryJS(`
      query {
        user {
          name
          follower {
            id
            name
            follower {
              id
              name
            }
          }
        }
      }
    `)
    const { hook, errors } = await generate('query.gql.ts', query)
    expect(errors).toEqual([])
    expect(toParsedOutput(hook)).toEqual(
      toParsedOutput(`
        import { QueryHookOptions, useQuery } from '@apollo/client'
        import gql from 'graphql-tag'

        const query = gql\`
          query userQuery($id: ID!, $followerId: ID!, $followerId1: ID!) {
            user(id: $id) {
              name
              follower(id: $followerId) {
                id
                name
                follower(id: $followerId1) {
                  id
                  name
                }
              }
            }
          }
        \`

        export interface UserQuery {
          user?: User
          __typename?: 'Query'
        }

        export interface User {
          name?: string
          follower?: UserFollower
          __typename?: 'User'
        }

        export interface UserFollower {
          id: string
          name?: string
          follower?: UserFollower1
          __typename?: 'User'
        }

        export interface UserFollower1 {
          id: string
          name?: string
          __typename?: 'User'
        }

        export interface Variables {
          id: string | undefined
          followerId: string | undefined
          followerId1: string | undefined
        }

        export function useUserQuery(
          variables: Variables,
          options?: QueryHookOptions<UserQuery, Variables>,
        ) {
          return useQuery<UserQuery, Variables>(query, {
            variables,
            skip: !variables.id || !variables.followerId || !variables.followerId1,
            ...options,
          })
        }`),
    )
  })

  test('should use the hook name set by user', async () => {
    const query = `
     import gql from 'graphql-tag'
     const query = gql\`
        query {
          user {
            name
          }
        }
      \`

      export function useMy(
          variables: Variables,
          options?: QueryHookOptions<UserQuery, Variables>,
        ) {
          return useQuery<UserAndFollowersQuery, Variables>(query, {
            variables,
            skip: !variables.id || !variables.followerId,
            ...options,
          })
        }
    `
    const { hook, errors } = await generate('query.gql.ts', query)
    expect(errors).toEqual([])
    expect(toParsedOutput(hook)).toEqual(
      toParsedOutput(`
        import { QueryHookOptions, useQuery } from '@apollo/client'
        import gql from 'graphql-tag'

        const query = gql\`
          query myQuery($id: ID!) {
            user(id: $id) {
              name
            }
          }
        \`

        export interface MyQuery {
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

        export function useMyQuery(variables: Variables, options?: QueryHookOptions<MyQuery, Variables>) {
          return useQuery<MyQuery, Variables>(query, {
            variables,
            skip: !variables.id,
            ...options,
          })
        }
      `),
    )
  })

  test('should fix batched query', async () => {
    const query = toQueryJS(`
      query {
        user {
          name
        }
        followers {
          id
        }
      }
    `)
    const { hook, errors } = await generate('query.gql.ts', query)
    expect(errors).toEqual([])
    expect(toParsedOutput(hook)).toEqual(
      toParsedOutput(`
        import { QueryHookOptions, useQuery } from '@apollo/client'
        import gql from 'graphql-tag'

        const query = gql\`
          query userAndFollowersQuery($id: ID!, $followerId: ID!, $limit: Int) {
            user(id: $id) {
              name
            }
            followers(id: $followerId, limit: $limit) {
              id
            }
          }
        \`

        export interface UserAndFollowersQuery {
          user?: User
          followers: UserFollowers[]
          __typename?: 'Query'
        }

        export interface User {
          name?: string
          __typename?: 'User'
        }

        export interface UserFollowers {
          id: string
          __typename?: 'User'
        }

        export interface Variables {
          id: string | undefined
          followerId: string | undefined
          limit?: number | undefined
        }

        export function useUserAndFollowersQuery(
          variables: Variables,
          options?: QueryHookOptions<UserAndFollowersQuery, Variables>,
        ) {
          return useQuery<UserAndFollowersQuery, Variables>(query, {
            variables,
            skip: !variables.id || !variables.followerId,
            ...options,
          })
        }
      `),
    )
  })

  test('should reuse existing variable names', async () => {
    const query = toQueryJS(`
      query ($userId: ID!, $followersId: ID!) {
        user(id: $userId) {
          name
        }
        followers(id: $followersId) {
          id
        }
      }
    `)
    const { hook, errors } = await generate('query.gql.ts', query)
    expect(errors).toEqual([])
    expect(toParsedOutput(hook)).toEqual(
      toParsedOutput(`
        import { QueryHookOptions, useQuery } from '@apollo/client'
        import gql from 'graphql-tag'

        const query = gql\`
          query userAndFollowersQuery($userId: ID!, $followersId: ID!, $limit: Int) {
            user(id: $userId) {
              name
            }
            followers(id: $followersId, limit: $limit) {
              id
            }
          }
        \`

        export interface UserAndFollowersQuery {
          user?: User
          followers: UserFollowers[]
          __typename?: 'Query'
        }

        export interface User {
          name?: string
          __typename?: 'User'
        }

        export interface UserFollowers {
          id: string
          __typename?: 'User'
        }

        export interface Variables {
          userId: string | undefined
          followersId: string | undefined
          limit?: number | undefined
        }

        export function useUserAndFollowersQuery(
          variables: Variables,
          options?: QueryHookOptions<UserAndFollowersQuery, Variables>,
        ) {
          return useQuery<UserAndFollowersQuery, Variables>(query, {
            variables,
             skip: !variables.userId || !variables.followersId,
            ...options,
          })
        }
      `),
    )
  })

  test('should work with common variable', async () => {
    const query = toQueryJS(`
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
    `)
    const { hook, errors } = await generate('query.gql.ts', query)
    expect(errors).toEqual([])
    expect(toParsedOutput(hook)).toEqual(
      toParsedOutput(`
        import { QueryHookOptions, useQuery } from '@apollo/client'
        import gql from 'graphql-tag'

        const query = gql\`
          query fetchTweetQuery($id: ID!, $size: ImageSize) {
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

        export interface FetchTweetQuery {
          tweet?: Tweet
          __typename?: 'Query'
        }

        export interface Tweet {
          id: string
          author: User
          mentions?: User[]
          __typename?: 'Tweet'
        }

        export interface User {
          id: string
          photo?: Image
          __typename?: 'User'
        }

        export interface Image {
          url: string
          __typename?: 'Image'
        }

        export enum ImageSize {
          SMALL = 'SMALL',
          NORMAL = 'NORMAL',
          LARGE = 'LARGE',
        }

        export interface Variables {
          id: string | undefined
          size?: ImageSize | undefined
        }

        export function useFetchTweetQuery(
          variables: Variables,
          options?: QueryHookOptions<FetchTweetQuery, Variables>,
        ) {
          return useQuery<FetchTweetQuery, Variables>(query, {
            variables,
            skip: !variables.id,
            ...options,
          })
        }
      `),
    )
  })

  test('should throw an error if invalid selector is used in a query', async () => {
    const query = toQueryJS(`
      query {
        user {
          id
          name
          invalid
        }
      }
    `)

    const { hook, errors } = await generate('query.gql.ts', query)
    expect(errors).not.toEqual([])
    expect(toParsedOutput(hook)).toEqual(
      toParsedOutput(`
        import { QueryHookOptions, useQuery } from '@apollo/client'
        import gql from 'graphql-tag'

        const query = gql\`
          query userQuery($id: ID!) {
            user(id: $id) {
              id
              name
              invalid
            }
          }
        \`

        export interface UserQuery {
          user?: User
          __typename?: 'Query'
        }

        export interface User {
          id: string
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

  test('should throw an error if invalid selector is used in a mutation', async () => {
    const query = toQueryJS(`
      mutation {
        registerUser {
          id
          name
          invalid
        }
      }
    `)
    const { hook, errors } = await generate('query.gql.ts', query)
    expect(errors).not.toEqual([])
    expect(toParsedOutput(hook)).toEqual(
      toParsedOutput(`
        import { MutationHookOptions, useMutation } from '@apollo/client'
        import gql from 'graphql-tag'

        const query = gql\`
          mutation registerUserMutation($input: RegisterUserInput!) {
            registerUser(input: $input) {
              id
              name
              invalid
            }
          }
        \`

        export interface RegisterUserMutation {
          registerUser: User
          __typename?: 'Mutation'
        }

        export interface User {
          id: string
          name?: string
          __typename?: 'User'
        }

        export interface RegisterUserInput {
          name: string
          email: string
          __typename?: 'RegisterUserInput'
        }

        export interface Variables {
          input: RegisterUserInput
        }

        export function useRegisterUserMutation(
          options?: MutationHookOptions<RegisterUserMutation, Variables>,
        ) {
          return useMutation<RegisterUserMutation, Variables>(query, options)
        }
        `),
    )
  })

  test('should throw an error if invalid selector is used in a subscription', async () => {
    const query = toQueryJS(`
      subscription subscribeToToOnUserUsage{
        onUserChange {
          id
          name
          invalid
        }
      }
    `)
    const { hook, errors } = await generate('query.gql.ts', query)
    expect(errors).not.toEqual([])
    expect(toParsedOutput(hook)).toEqual(
      toParsedOutput(`
        import { SubscriptionHookOptions, useSubscription } from '@apollo/client'
        import gql from 'graphql-tag'

        const query = gql\`
          subscription subscribeToToOnUserUsageSubscription($id: ID!) {
            onUserChange(id: $id) {
              id
              name
              invalid
            }
          }
        \`

        export interface SubscribeToToOnUserUsageSubscription {
          onUserChange: User
          __typename?: 'Subscription'
        }

        export interface User {
          id: string
          name?: string
          __typename?: 'User'
        }

        export interface Variables {
          id: string
        }

        export function useSubscribeToToOnUserUsageSubscription(
          options?: SubscriptionHookOptions<SubscribeToToOnUserUsageSubscription, Variables>,
        ) {
          return useSubscription<SubscribeToToOnUserUsageSubscription, Variables>(query, options)
        }
      `),
    )
  })

  test('should fix argument for a simple mutation', async () => {
    const query = toQueryJS(`
      mutation {
        registerUser {
          id
          name
        }
      }
    `)
    const { hook, errors } = await generate('query.gql.ts', query)
    expect(errors).toEqual([])
    expect(toParsedOutput(hook)).toEqual(
      toParsedOutput(`
        import { MutationHookOptions, useMutation } from '@apollo/client'
        import gql from 'graphql-tag'

        const query = gql\`
          mutation registerUserMutation($input: RegisterUserInput!) {
            registerUser(input: $input) {
              id
              name
            }
          }
        \`

        export interface RegisterUserMutation {
          registerUser: User
          __typename?: 'Mutation'
        }

        export interface User {
          id: string
          name?: string
          __typename?: 'User'
        }

        export interface RegisterUserInput {
          name: string
          email: string
          __typename?: 'RegisterUserInput'
        }

        export interface Variables {
          input: RegisterUserInput
        }

        export function useRegisterUserMutation(
          options?: MutationHookOptions<RegisterUserMutation, Variables>,
        ) {
          return useMutation<RegisterUserMutation, Variables>(query, options)
        }

        `),
    )
  })

  test('should fix argument for a simple subscription', async () => {
    const query = toQueryJS(`
      subscription {
        onUserChange {
          id
          name
        }
      }
    `)
    const { hook, errors } = await generate('query.gql.ts', query)
    expect(errors).toEqual([])
    expect(toParsedOutput(hook)).toEqual(
      toParsedOutput(`
        import { SubscriptionHookOptions, useSubscription } from '@apollo/client'
        import gql from 'graphql-tag'

        const query = gql\`
          subscription onUserChangeSubscription($id: ID!) {
            onUserChange(id: $id) {
              id
              name
            }
          }
        \`

        export interface OnUserChangeSubscription {
          onUserChange: User
          __typename?: 'Subscription'
        }

        export interface User {
          id: string
          name?: string
          __typename?: 'User'
        }

        export interface Variables {
          id: string
        }

        export function useOnUserChangeSubscription(
          options?: SubscriptionHookOptions<OnUserChangeSubscription, Variables>,
        ) {
          return useSubscription<OnUserChangeSubscription, Variables>(query, options)
        }
      `),
    )
  })

  test('should work with enums', async () => {
    const query = toQueryJS(`
      query {
        user {
          id
          status
        }
      }
    `)
    const { hook, errors } = await generate('query.gql.ts', query)
    expect(errors).toEqual([])
    expect(toParsedOutput(hook)).toEqual(
      toParsedOutput(`
        import { QueryHookOptions, useQuery } from '@apollo/client'
        import gql from 'graphql-tag'

        const query = gql\`
          query userQuery($id: ID!) {
            user(id: $id) {
              id
              status
            }
          }
        \`

        export interface UserQuery {
          user?: User
          __typename?: 'Query'
        }

        export interface User {
          id: string
          status?: UserStatus
          __typename?: 'User'
        }

        export enum UserStatus {
          ACTIVE = 'ACTIVE',
          INACTIVE = 'INACTIVE',
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

  test('should work with union', async () => {
    const query = toQueryJS(`
      query {
        myNotifications {
          ... on FollowNotification {
            id
            user {
              id
              photo {
                url
              }
            }
          }
          ... on TweetNotification {
            id
            tweet {
              id
              author {
                photo {
                  url
                }
              }
            }
          }
        }
      }
    `)
    const { hook, errors } = await generate('query.gql.ts', query)
    expect(errors).toEqual([])
    expect(toParsedOutput(hook)).toEqual(
      toParsedOutput(`
        import { QueryHookOptions, useQuery } from '@apollo/client'
        import gql from 'graphql-tag'

        const query = gql\`
          query myNotificationsQuery($size: ImageSize, $urlSize: ImageSize) {
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
                    photo {
                      url(size: $urlSize)
                    }
                  }
                }
              }
            }
          }
        \`

        export interface MyNotificationsQuery {
          myNotifications: Notification[]
          __typename?: 'Query'
        }

        export type Notification = FollowNotification | TweetNotification

        export interface FollowNotification {
          id: string
          user: User
          __typename?: 'FollowNotification'
        }

        export interface User {
          id: string
          photo?: Image
          __typename?: 'User'
        }

        export interface Image {
          url: string
          __typename?: 'Image'
        }

        export enum ImageSize {
          SMALL = 'SMALL',
          NORMAL = 'NORMAL',
          LARGE = 'LARGE',
        }

        export interface TweetNotification {
          id: string
          tweet: Tweet
          __typename?: 'TweetNotification'
        }

        export interface Tweet {
          id: string
          author: UserAuthor
          __typename?: 'Tweet'
        }

        export interface UserAuthor {
          photo?: Image
          __typename?: 'User'
        }

        export interface Variables {
          size?: ImageSize | undefined
          urlSize?: ImageSize | undefined
        }

        export function useMyNotificationsQuery(
          variables?: Variables,
          options?: QueryHookOptions<MyNotificationsQuery, Variables>,
        ) {
          return useQuery<MyNotificationsQuery, Variables>(query, {
            variables,
            ...options,
          })
        }
      `),
    )
  })

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

  test('should generate query and its types with graphql', async () => {
    const query = `
      const query = graphql\`
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

  test('should generate query and its types with enum', async () => {
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
    expect(errors).toEqual([])
    expect(toParsedOutput(hook)).toEqual(
      toParsedOutput(`
        import { QueryHookOptions, useQuery } from '@apollo/client'
        import gql from 'graphql-tag'

        const query = gql\`
          query userQuery($id: ID!) {
            user(id: $id) {
              id
              status
            }
          }
        \`

        export interface UserQuery {
          user?: User
					__typename?: 'Query'
        }

        export interface User {
          id: string
          status?: UserStatus
					__typename?: 'User'
        }

        export enum UserStatus {
          ACTIVE = 'ACTIVE',
          INACTIVE = 'INACTIVE',
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

  test('should generate query with optional request parameter if none of the imports are mandatory', async () => {
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
    const { hook, errors } = await generate('use-query.gql.ts', query)
    expect(errors).toEqual([])
    expect(toParsedOutput(hook)).toEqual(
      toParsedOutput(`import { QueryHookOptions, useQuery } from '@apollo/client'
      import gql from 'graphql-tag'

      const query = gql\`
        query usersQuery($next: String) {
          users(next: $next) {
            id
            status
          }
        }
      \`

      export interface UsersQuery {
        users: User[]
        __typename?: 'Query'
      }

      export interface User {
        id: string
        status?: UserStatus
        __typename?: 'User'
      }

      export enum UserStatus {
        ACTIVE = 'ACTIVE',
        INACTIVE = 'INACTIVE',
      }

      export interface Variables {
        next?: string | undefined
      }

      export function useUsersQuery(
        variables?: Variables,
        options?: QueryHookOptions<UsersQuery, Variables>,
      ) {
        return useQuery<UsersQuery, Variables>(query, {
          variables,
          ...options,
        })
      }
      `),
    )
  })

  test('should generate query with date', async () => {
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
    const { hook, errors } = await generate('use-query.gql.ts', query)
    expect(errors).toEqual([])
    expect(toParsedOutput(hook)).toEqual(
      toParsedOutput(`
        import { QueryHookOptions, useQuery } from '@apollo/client'
        import gql from 'graphql-tag'

        const query = gql\`
          query userQuery($id: ID!) {
            user(id: $id) {
              id
              createdAt
            }
          }
        \`

        export interface UserQuery {
          user?: User
					__typename?: 'Query'
        }

        export interface User {
          id: string
          createdAt?: DateTime
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

  test('should generate mutation and its types', async () => {
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
    const { hook, errors } = await generate('use-query.gql.ts', query)
    expect(errors).toEqual([])
    expect(toParsedOutput(hook)).toEqual(
      toParsedOutput(`
        import { MutationHookOptions, useMutation } from '@apollo/client'
        import gql from 'graphql-tag'

        const mutation = gql\`
          mutation registerUserMutation($input: RegisterUserInput!) {
            registerUser(input: $input) {
              id
              name
              email
            }
          }
        \`

        export interface RegisterUserMutation {
          registerUser: User
					__typename?: 'Mutation'
        }

        export interface User {
          id: string
          name?: string
          email?: string
					__typename?: 'User'
        }

        export interface RegisterUserInput {
          name: string
          email: string
					__typename?: 'RegisterUserInput'
        }

        export interface Variables {
          input: RegisterUserInput
        }

        export function useRegisterUserMutation(
          options?: MutationHookOptions<RegisterUserMutation, Variables>,
        ) {
          return useMutation<RegisterUserMutation, Variables>(mutation, options)
        }
    `),
    )
  })

  test('should generate subscription and its types', async () => {
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
    const { hook, errors } = await generate('use-query.gql.ts', query)
    expect(errors).toEqual([])
    expect(toParsedOutput(hook)).toEqual(
      toParsedOutput(`
        import { SubscriptionHookOptions, useSubscription } from '@apollo/client'
        import gql from 'graphql-tag'

        const subscription = gql\`
          subscription onUserChangeSubscription($id: ID!) {
            onUserChange(id: $id) {
              id
              name
            }
          }
        \`

        export interface OnUserChangeSubscription {
          onUserChange: User
          __typename?: 'Subscription'
        }

        export interface User {
          id: string
          name?: string
          __typename?: 'User'
        }

        export interface Variables {
          id: string
        }

        export function useOnUserChangeSubscription(
          options?: SubscriptionHookOptions<OnUserChangeSubscription, Variables>,
        ) {
          return useSubscription<OnUserChangeSubscription, Variables>(subscription, options)
        }
    `),
    )
  })

  test('should generate query with shared variable', async () => {
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
    const { hook, errors } = await generate('use-query.gql.ts', query)
    expect(errors).toEqual([])
    expect(toParsedOutput(hook)).toEqual(
      toParsedOutput(`
        import { QueryHookOptions, useQuery } from '@apollo/client'
        import gql from 'graphql-tag'

        const query = gql\`
          query fetchTweetQuery($id: ID!, $size: ImageSize) {
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

        export interface FetchTweetQuery {
          tweet?: Tweet
          __typename?: 'Query'
        }

        export interface Tweet {
          id: string
          author: User
          mentions?: User[]
          __typename?: 'Tweet'
        }

        export interface User {
          id: string
          photo?: Image
          __typename?: 'User'
        }

        export interface Image {
          url: string
          __typename?: 'Image'
        }

        export enum ImageSize {
          SMALL = 'SMALL',
          NORMAL = 'NORMAL',
          LARGE = 'LARGE',
        }

        export interface Variables {
          id: string | undefined
          size?: ImageSize | undefined
        }

        export function useFetchTweetQuery(
          variables: Variables,
          options?: QueryHookOptions<FetchTweetQuery, Variables>,
        ) {
          return useQuery<FetchTweetQuery, Variables>(query, {
            variables,
            skip: !variables.id,
            ...options,
          })
        }
    `),
    )
  })

  test('should generate query with no request type if query has no parameters', async () => {
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
    const { hook, errors } = await generate('use-query.gql.ts', query)
    expect(errors).toEqual([])
    expect(toParsedOutput(hook)).toEqual(
      toParsedOutput(`
        import { QueryHookOptions, useQuery } from '@apollo/client'
        import gql from 'graphql-tag'

        const query = gql\`
          query meQuery {
            me {
              id
              name
              email
            }
          }
        \`

        export interface MeQuery {
          me?: User
          __typename?: 'Query'
        }

        export interface User {
          id: string
          name?: string
          email?: string
					__typename?: 'User'
        }

        export function useMeQuery(options?: QueryHookOptions<MeQuery, never>) {
          return useQuery<MeQuery, never>(query, options)
        }
    `),
    )
  })

  test('should generate lazy query with no parameters', async () => {
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
    const { hook, errors } = await generate('use-query.gql.ts', query)
    expect(errors).toEqual([])
    expect(toParsedOutput(hook)).toEqual(
      toParsedOutput(`
        import { LazyQueryHookOptions, useLazyQuery } from '@apollo/client'
        import gql from 'graphql-tag'

        const lazyQuery = gql\`
          query meQuery {
            me {
              id
              name
              email
            }
          }
        \`

        export interface MeQuery {
          me?: User
          __typename?: 'Query'
        }

        export interface User {
          id: string
          name?: string
          email?: string
					__typename?: 'User'
        }

        export function useMeQuery(options?: LazyQueryHookOptions<MeQuery, never>) {
          return useLazyQuery<MeQuery, never>(lazyQuery, options)
        }
    `),
    )
  })

  test('should generate lazy query and its types', async () => {
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
    const { hook, errors } = await generate('use-query.gql.ts', query)
    expect(errors).toEqual([])
    expect(toParsedOutput(hook)).toEqual(
      toParsedOutput(`
        import { LazyQueryHookOptions, useLazyQuery } from '@apollo/client'
        import gql from 'graphql-tag'

        const lazyQuery = gql\`
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
          options?: LazyQueryHookOptions<UserQuery, Variables>,
        ) {
          return useLazyQuery<UserQuery, Variables>(lazyQuery, {
            variables,
            ...options,
          })
        }
    `),
    )
  })

  test('should generate query with no request type if query has no parameters', async () => {
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
    const { hook, errors } = await generate('use-query.gql.ts', query)
    expect(errors).toEqual([])
    expect(toParsedOutput(hook)).toEqual(
      toParsedOutput(`
        import { MutationHookOptions, useMutation } from '@apollo/client'
        import gql from 'graphql-tag'

        const mutation = gql\`
          mutation signInMutation {
            signIn {
              id
            }
          }
        \`

        export interface SignInMutation {
          signIn: User
          __typename?: 'Mutation'
        }

        export interface User {
          id: string
					__typename?: 'User'
        }

        export function useSignInMutation(options?: MutationHookOptions<SignInMutation, never>) {
          return useMutation<SignInMutation, never>(mutation, options)
        }
    `),
    )
  })

  test('should generate query with union', async () => {
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
    const { hook, errors } = await generate('use-query.gql.ts', query)
    expect(errors).toEqual([])
    expect(toParsedOutput(hook)).toEqual(
      toParsedOutput(`
        import { QueryHookOptions, useQuery } from '@apollo/client'
        import gql from 'graphql-tag'

        const query = gql\`
          query fetchMyNotificationsQuery($size: ImageSize) {
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

        export interface FetchMyNotificationsQuery {
          myNotifications: Notification[]
          __typename?: 'Query'
        }

        export type Notification = FollowNotification | TweetNotification

        export interface FollowNotification {
          id: string
          user: User
          __typename?: 'FollowNotification'
        }

        export interface User {
          id: string
          photo?: Image
          __typename?: 'User'
        }

        export interface Image {
          url: string
          __typename?: 'Image'
        }

        export enum ImageSize {
          SMALL = 'SMALL',
          NORMAL = 'NORMAL',
          LARGE = 'LARGE',
        }

        export interface TweetNotification {
          id: string
          tweet: Tweet
          __typename?: 'TweetNotification'
        }

        export interface Tweet {
          id: string
          author: User
          __typename?: 'Tweet'
        }

        export interface Variables {
          size?: ImageSize | undefined
        }

        export function useFetchMyNotificationsQuery(
          variables?: Variables,
          options?: QueryHookOptions<FetchMyNotificationsQuery, Variables>,
        ) {
          return useQuery<FetchMyNotificationsQuery, Variables>(query, {
            variables,
            ...options,
          })
        }
    `),
    )
  })

  test('should not generate if not enabled', async () => {
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
    const { hook, errors } = await generate('use-query.gql.ts', query, {
      ...config,
      reactHook: { ...config.reactHook, enable: false },
    })
    expect(errors).toEqual([])
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

  test('should not generate if files extension does not match', async () => {
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
    const { hook, errors } = await generate('use-query.gql.ts', query, {
      ...config,
      reactHook: { ...config.reactHook, fileExtensions: ['user-query.ts'] },
    })
    expect(errors).toEqual([])
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

  test('should not generate if files extension does not match default', async () => {
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
    const { hook, errors } = await generate('use-query.ts', query)
    expect(errors).toEqual([])
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
