import * as gql from 'graphql'
import { getTypeDefinition } from './get-type-definition'

export function resolveAbsoluteFieldName(node: gql.TypeNode) {
  if (node.kind === gql.Kind.NAMED_TYPE) {
    return node.name.value
  } else if (node.kind === gql.Kind.LIST_TYPE) {
    return resolveAbsoluteFieldName(node.type)
  } else if (node.kind === gql.Kind.NON_NULL_TYPE) {
    return resolveAbsoluteFieldName(node.type)
  }
}

export function getFieldType(documentNode: gql.DocumentNode, field: gql.FieldDefinitionNode) {
  const name = resolveAbsoluteFieldName(field.type)
  if (!name) return undefined
  return getTypeDefinition(documentNode, name)
}
