import * as gql from 'graphql'

export function updateArguments(node: gql.FieldNode, args: gql.InputValueDefinitionNode[]) {
  return { ...node, arguments: args }
}
