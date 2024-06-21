import * as gql from 'graphql'

export function updateName(node: gql.ASTNode, name: string) {
  return { ...node, name: { kind: gql.Kind.NAME, value: name } }
}
