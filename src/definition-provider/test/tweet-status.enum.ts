import { registerEnumType } from '@nestjs/graphql'

export enum TweetStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
}
registerEnumType(TweetStatus, { name: 'TweetStatus' })
