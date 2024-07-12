import { GraphQLScalarType, Kind, ValueNode } from 'graphql'

function validate(value: unknown): string {
  if (!value || typeof value !== 'string') throw new Error('Invalid id')
  return value
}

export const TweetIdForInternalUsers = new GraphQLScalarType({
  name: 'TweetIdForInternalUsers',
  description: 'A string that uniquely identifies an object of a type',
  serialize: value => validate(value),
  parseValue: value => validate(value),
  parseLiteral: (ast: ValueNode) => (ast.kind === Kind.STRING ? validate(ast.value) : null),
})
