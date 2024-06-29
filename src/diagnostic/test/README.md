The schema is quite comprehensive, includes all major GraphQL concepts for thorough testing of a
linting tool.

```graphql
# Scalar types for custom validation
scalar DateTime
scalar URL
scalar Email

# Enum to define the types of actions a user can perform
enum ActionType {
  LIKE
  RETWEET
  REPLY
  FOLLOW
  UNFOLLOW
}

# Directive for deprecation
directive @deprecated(reason: String = "No longer supported") on FIELD_DEFINITION | ENUM_VALUE

# Directive for caching (example)
directive @cacheControl(maxAge: Int) on FIELD_DEFINITION | OBJECT | INTERFACE

# Interface for common fields in different post types
interface Post {
  id: ID!
  content: String!
  author: User!
  createdAt: DateTime!
  likeCount: Int!
  actionType: ActionType
}

# Types for Tweet, Reply, and Retweet implementing the Post interface
type Tweet implements Post {
  id: ID!
  content: String!
  author: User!
  createdAt: DateTime!
  likeCount: Int!
  retweetCount: Int!
  replyCount: Int!
  actionType: ActionType
}

type Reply implements Post {
  id: ID!
  content: String!
  author: User!
  createdAt: DateTime!
  inReplyTo: Tweet!
  likeCount: Int!
  actionType: ActionType
}

type Retweet implements Post {
  id: ID!
  originalTweet: Tweet!
  author: User!
  createdAt: DateTime!
  likeCount: Int!
  actionType: ActionType
}

# Union type for the feed
union FeedItem = Tweet | Reply | Retweet

# User type with various fields and a deprecated field
type User {
  id: ID!
  username: String!
  displayName: String
  bio: String
  profileImage: URL
  email: Email
  followersCount: Int!
  followingCount: Int!
  tweets: [Tweet!]
  followers: [User!]
  following: [User!]
  legacyField: String @deprecated(reason: "Use anotherField instead")
}

# Input types for mutations
input PostTweetInput {
  content: String!
}

input ReplyToTweetInput {
  tweetId: ID!
  content: String!
}

input RetweetInput {
  tweetId: ID!
}

input FollowUserInput {
  userId: ID!
}

input UnfollowUserInput {
  userId: ID!
}

# Response objects for mutations
type PostTweetResponse {
  success: Boolean!
  message: String
  tweet: Tweet
}

type ReplyToTweetResponse {
  success: Boolean!
  message: String
  reply: Reply
}

type RetweetResponse {
  success: Boolean!
  message: String
  retweet: Retweet
}

type FollowUserResponse {
  success: Boolean!
  message: String
  user: User
}

type UnfollowUserResponse {
  success: Boolean!
  message: String
  user: User
}

# Custom error type for mutation responses
union MutationResponse =
  | PostTweetResponse
  | ReplyToTweetResponse
  | RetweetResponse
  | FollowUserResponse
  | UnfollowUserResponse
  | ErrorResponse

type ErrorResponse {
  success: Boolean!
  message: String!
}

# Pagination types for feed
type FeedConnection {
  items: [FeedItem!]!
  pageInfo: PageInfo!
}

type PageInfo {
  endCursor: String
  hasNextPage: Boolean!
}

# Query type with field arguments
type Query {
  feed(first: Int, after: String): FeedConnection! @cacheControl(maxAge: 60)
  user(id: ID!): User @cacheControl(maxAge: 60)
  tweetsByUser(userId: ID!, first: Int, after: String): FeedConnection!
  followers(userId: ID!, first: Int, after: String): [User!]
  following(userId: ID!, first: Int, after: String): [User!]
}

# Mutation type with input types and union response
type Mutation {
  postTweet(input: PostTweetInput!): MutationResponse!
  replyToTweet(input: ReplyToTweetInput!): MutationResponse!
  retweet(input: RetweetInput!): MutationResponse!
  followUser(input: FollowUserInput!): MutationResponse!
  unfollowUser(input: UnfollowUserInput!): MutationResponse!
}

# Subscription type for real-time updates
type Subscription {
  tweetPosted: Tweet!
  userFollowed: User!
}

# Fragment for reusable field sets
fragment UserFields on User {
  id
  username
  displayName
  bio
  profileImage
}

# Example query using fragment
query GetUser {
  user(id: "1") {
    ...UserFields
    followersCount
    followingCount
  }
}

# Schema definition
schema {
  query: Query
  mutation: Mutation
  subscription: Subscription
}
```

### Concepts

1. **Scalars**: Added `Email` to custom scalars `DateTime` and `URL`.
2. **Enum**: `ActionType` includes more actions (`FOLLOW`, `UNFOLLOW`).
3. **Directives**:
   - Custom `@deprecated` directive used on a field.
   - Example `@cacheControl` directive for caching control.
4. **Interfaces**: `Post` interface implemented by `Tweet`, `Reply`, and `Retweet`.
5. **Unions**: `FeedItem` union and `MutationResponse` union for custom error handling.
6. **Input Types**: Various input types for mutations.
7. **Response Types**: Detailed response types for mutations.
8. **Pagination**: Types `FeedConnection` and `PageInfo` for pagination.
9. **Queries, Mutations, Subscriptions**: Comprehensive set of operations with field arguments and
   input types.
10. **Fragments**: Example of a reusable fragment (`UserFields`).
11. **Custom Error Handling**: `MutationResponse` union includes potential error responses.
