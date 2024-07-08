import { Field, ID, ObjectType } from '@nestjs/graphql'
import { Model } from './base.model'

@ObjectType()
export class User extends Model {
  @Field({ nullable: true })
  name?: string
}
