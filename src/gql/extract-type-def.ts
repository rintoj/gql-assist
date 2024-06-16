import * as gql from 'graphql'
import { ById } from 'tsds-tools'

// Function to determine if a type is a scalar type
const scalarTypes = ['Int', 'Float', 'String', 'Boolean', 'ID', 'Date']

function isScalar(type: string) {
  return scalarTypes.includes(type)
}
// Function to extract type definitions

export interface FieldDef {
  objectName: string
  fieldName: string
  type: string
  isArray?: boolean
  isRequired?: boolean
  isScalar?: boolean
}

export function extractTypeDefinitions(schema: gql.DocumentNode) {
  const typeDefs: ById<ById<FieldDef>> = {}
  gql.visit(schema, {
    ObjectTypeDefinition(node) {
      const objectName = node.name.value
      typeDefs[objectName] = {} as any

      node.fields?.forEach(field => {
        const fieldName = field.name.value
        let type = field.type
        let isArray = false
        let isRequired = false
        let isScalarType = false

        // Check if the type is a NonNullType
        if (type.kind === 'NonNullType') {
          isRequired = true
          type = type.type
        }

        // Check if the type is a ListType
        if (type.kind === 'ListType') {
          isArray = true
          type = type.type

          // Check if the type inside the list is a NonNullType
          if (type.kind === 'NonNullType') {
            type = type.type
          }
        }

        // Get the final type name
        const typeName =
          type.kind === gql.Kind.NAMED_TYPE ? type.name.value : (type as any).type.name.value
        isScalarType = isScalar(typeName)

        typeDefs[objectName][fieldName] = {
          objectName,
          fieldName,
          type: typeName,
          isArray,
          isRequired,
          isScalar: isScalarType,
        }
      })
    },
  })

  return typeDefs
}
