import * as gql from 'graphql'
import { getTypeDefinition } from './get-type-definition'

export function getFieldType(documentNode: gql.DocumentNode, field: gql.FieldDefinitionNode) {
  if (field.type.kind === gql.Kind.NAMED_TYPE) {
    return getTypeDefinition(documentNode, field.type.name.value)
  }
}
