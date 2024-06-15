import * as gql from 'graphql'

export function getFieldFromTypeDefinition(
  typeDefinition: gql.ObjectTypeDefinitionNode,
  fieldName: string,
) {
  if (typeDefinition && typeDefinition.fields) {
    for (const field of typeDefinition.fields) {
      if (field.name.value === fieldName) {
        return field
      }
    }
  }
}
