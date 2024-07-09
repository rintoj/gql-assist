import { Query, Resolver } from '@nestjs/graphql'
import { Tweet } from './tweet.model'

@Resolver()
export class TweetResolver {
  @Query(() => Tweet)
  tweet() {
    return null
  }
}
