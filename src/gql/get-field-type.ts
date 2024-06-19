import * as gql from 'graphql'
import { getTypeDefinition } from './get-type-definition'

export function resolveAbsoluteFieldType(node: gql.TypeNode) {
  if (node.kind === gql.Kind.NAMED_TYPE) {
    return node.name.value
  } else if (node.kind === gql.Kind.LIST_TYPE) {
    return resolveAbsoluteFieldType(node.type)
  } else if (node.kind === gql.Kind.NON_NULL_TYPE) {
    return resolveAbsoluteFieldType(node.type)
  }
}

export function getFieldType(documentNode: gql.DocumentNode, field: gql.FieldDefinitionNode) {
  const name = resolveAbsoluteFieldType(field.type)
  if (!name) return undefined
  console.log(name)
  return getTypeDefinition(documentNode, name)
}
