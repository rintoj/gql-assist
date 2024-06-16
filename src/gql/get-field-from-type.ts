import * as gql from 'graphql'

export function getFieldDefinitionFromParent(
  parent: gql.ObjectTypeDefinitionNode,
  fieldName: string,
) {
  if (parent && parent.fields) {
    for (const field of parent.fields) {
      if (field.name.value === fieldName) {
        return field
      }
    }
  }
}
