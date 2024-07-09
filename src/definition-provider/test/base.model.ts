import { Field, ID, ObjectType } from '@nestjs/graphql'

@ObjectType()
export class Model {
  @Field(() => ID)
  id!: string
}
