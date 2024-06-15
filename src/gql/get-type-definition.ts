import * as gql from 'graphql'

export function getTypeDefinition(documentNode: gql.DocumentNode, typeName: string) {
  for (const definition of documentNode.definitions) {
    if (definition.kind === gql.Kind.OBJECT_TYPE_DEFINITION && definition.name.value === typeName) {
      return definition
    }
  }
}
