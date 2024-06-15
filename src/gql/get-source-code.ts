import * as gql from 'graphql'

export function getSourceCode(node: gql.ASTNode) {
  if (!node?.loc?.source?.body) return
  return node.loc?.source.body.substring(node.loc.start, node.loc.end)
}
