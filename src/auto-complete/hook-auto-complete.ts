import * as gql from 'graphql'
import ts from 'typescript'
import { GQLAssistConfig } from '../config'
import { Position } from '../diff'
import { isFieldNode, isSelectionSetNode, makeQueryParsable } from '../gql'
import { getGQLNodeLocationRange } from '../gql/get-gql-node-location-range'
import { isPositionWithInRange } from '../position'
import { getGQLContent, getGraphQLQueryVariable, getTSNodeLocationRange } from '../ts'
import { toNonNullArray } from 'tsds-tools'

function isInRange(node: gql.ASTNode, position: Position, offset?: Position) {
  const nodeRange = getGQLNodeLocationRange(node, offset)
  return isPositionWithInRange(position, nodeRange)
}

export interface FieldInformation {
  parentType: string
  name: string
  type: string
  isArray: boolean
  isNullable: boolean
  isScalar: boolean
  insertText: string
}

const topLevelInfo: FieldInformation[] = [
  gql.OperationTypeNode.QUERY,
  gql.OperationTypeNode.MUTATION,
  gql.OperationTypeNode.SUBSCRIPTION,
].map(name => ({
  parentType: 'GraphQL',
  name,
  type: 'Operation',
  isArray: false,
  isNullable: false,
  isScalar: false,
  insertText: `${name} { }`,
}))

function isEmptyQuery(query: string) {
  const formatted = query
    .split(/\s+/)
    .filter(i => i !== '')
    .join('')
  if (formatted === '') return true
  if (/^qu?e?r?y?$/.test(formatted)) return true
  if (/^mu?t?a?t?i?o?n?$/.test(formatted)) return true
  if (/^su?b?s?c?r?i?p?t?i?o?n?$/.test(formatted)) return true
  return false
}

function isFieldName(field: gql.GraphQLField<any, any, any>, name: string) {
  return field.name === name
}

function getFirstFieldByScalarType(objectType: gql.GraphQLObjectType, type: string) {
  const fields = Object.values(objectType.getFields())
  return fields.find(field => {
    const nullableType = gql.getNullableType(field.type)
    const isScalar = gql.isScalarType(nullableType)
    if (isScalar) {
      const namedType = gql.getNamedType(nullableType)
      return namedType.name === type
    }
  })
}

function getFirstScalarFieldByName(objectType: gql.GraphQLObjectType, name: string) {
  const fields = Object.values(objectType.getFields())
  return fields.find(field => {
    const nullableType = gql.getNullableType(field.type)
    return gql.isScalarType(nullableType) && field.name === name
  })
}

function identifyDefaultField(nullableType: gql.GraphQLNullableType) {
  const objectType = gql.getNamedType(nullableType)
  if (!gql.isObjectType(objectType)) return undefined
  const fieldByType = getFirstFieldByScalarType(objectType, 'ID')
  if (fieldByType) return fieldByType.name
  const fieldByName = getFirstScalarFieldByName(objectType, 'id')
  if (fieldByName) return fieldByName.name
  return '__typename'
}

export function autoCompleteHook(
  sourceFile: ts.SourceFile,
  position: Position,
  schema: gql.GraphQLSchema,
  config: GQLAssistConfig,
): FieldInformation[] {
  const variable = getGraphQLQueryVariable(sourceFile)
  if (!variable) return []

  const range = getTSNodeLocationRange(variable, sourceFile)
  if (!isPositionWithInRange(position, range)) return []

  const query = getGQLContent(variable)
  if (!query || query?.trim() === '') return topLevelInfo
  if (isEmptyQuery(query)) return topLevelInfo

  const offset = new Position(range.start.line, 0)

  try {
    const fixed = makeQueryParsable(query)
    const document = gql.parse(fixed)
    let schemaType: gql.GraphQLObjectType | null | undefined
    let existingFields: string[] = []
    const typeInfo = new gql.TypeInfo(schema)
    gql.visit(
      document,
      gql.visitWithTypeInfo(typeInfo, {
        SelectionSet(node) {
          if (isInRange(node, position, offset)) {
            const type = typeInfo.getParentType()
            if (!type || gql.isObjectType(type)) {
              schemaType = type
              existingFields = toNonNullArray(
                node.selections.map(f => (isFieldNode(f) ? f.name.value : undefined)),
              )
            }
          }
        },
      }),
    )
    if (!schemaType || !gql.isObjectType(schemaType)) return []
    const fields = schemaType.getFields()
    return toNonNullArray(
      Object.values(fields)
        .filter(field => !existingFields.includes(field.name))
        .map(field => {
          const nullableType = gql.getNullableType(field.type)
          const isScalar = gql.isScalarType(nullableType)
          const defaultField = identifyDefaultField(field.type)
          if (!schemaType) return
          return {
            parentType: schemaType.name,
            name: field.name,
            type: gql.getNamedType(field.type).name,
            isNullable: gql.isNullableType(field.type),
            isArray: gql.isListType(nullableType),
            isScalar,
            insertText: isScalar ? field.name : `${field.name} { ${defaultField} }`,
          }
        }),
    )
  } catch (e) {
    console.error(e)
    return []
  }
}
