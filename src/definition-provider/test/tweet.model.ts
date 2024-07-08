import { Field, ID, ObjectType } from '@nestjs/graphql'
import { User } from './user.model'

@ObjectType('Tweet')
export class Tweet {
  @Field(() => ID)
  id!: string

  mentions: [User]
}
