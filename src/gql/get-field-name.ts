import * as gql from 'graphql'
import { className } from '../util'

export function getAllSelectorNames(node: gql.FieldNode | gql.OperationDefinitionNode) {
  return (node.selectionSet?.selections ?? []).map(s =>
    s.kind === gql.Kind.FIELD ? s.name.value : '',
  )
}

export function getFieldName(node: gql.FieldNode | gql.OperationDefinitionNode) {
  if (node.kind === gql.Kind.OPERATION_DEFINITION) {
    return className(node.name?.value ?? getAllSelectorNames(node).join('-and-'))
  }
  return className(node.name?.value)
}

export function getFieldHash(name: string, node: gql.FieldNode | gql.OperationDefinitionNode) {
  return className(name, '(', getAllSelectorNames(node).join(','), ')')
}
