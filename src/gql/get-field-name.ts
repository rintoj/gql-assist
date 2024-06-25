import * as gql from 'graphql'
import { className } from '../util'
import { getNodeName } from '../gql'

export function getAllSelectorNames(
  node: gql.FieldNode | gql.OperationDefinitionNode | gql.InlineFragmentNode,
) {
  return (node.selectionSet?.selections ?? []).map(s =>
    s.kind === gql.Kind.FIELD ? s.name.value : '',
  )
}

export function getFieldName(
  node: gql.FieldNode | gql.OperationDefinitionNode | gql.InlineFragmentNode,
) {
  if (node.kind === gql.Kind.OPERATION_DEFINITION) {
    return className(node.name?.value ?? getAllSelectorNames(node).join('-and-'))
  }
  return className(getNodeName(node))
}

export function getFieldHash(
  name: string,
  node: gql.FieldNode | gql.OperationDefinitionNode | gql.InlineFragmentNode,
) {
  return className(name, '(', getAllSelectorNames(node).join(','), ')')
}
