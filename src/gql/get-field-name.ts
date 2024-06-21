import * as gql from 'graphql'
import { className } from '../util'

export function getFieldName(node: gql.FieldNode | gql.OperationDefinitionNode) {
  if (node.kind === gql.Kind.OPERATION_DEFINITION) {
    const name = node.name?.value ?? getAllSelectorNames(node).join('-and-')
    return className(name, node.kind === gql.Kind.OPERATION_DEFINITION && node.operation)
  }
  return className(node.name?.value)
}

export function getAllSelectorNames(node: gql.FieldNode | gql.OperationDefinitionNode) {
  return (node.selectionSet?.selections ?? []).map(s =>
    s.kind === gql.Kind.FIELD ? s.name.value : '',
  )
}

export function getFieldHash(node: gql.FieldNode | gql.OperationDefinitionNode) {
  return className(node.name?.value, '(', getAllSelectorNames(node).join(','), ')')
}
