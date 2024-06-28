import * as gql from 'graphql'
import ts from 'typescript'
import { GQLAssistConfig } from '../config'
import { Position } from '../diff'
import { isSelectionSetNode, makeQueryParsable } from '../gql'
import { getGQLNodeLocationRange } from '../gql/get-gql-node-location-range'
import { isPositionWithInRange } from '../position'
import { getGQLContent, getGraphQLQueryVariable, getTSNodeLocationRange } from '../ts'

function isInRange(node: gql.ASTNode, position: Position, offset?: Position) {
  const nodeRange = getGQLNodeLocationRange(node, offset)
  return isPositionWithInRange(position, nodeRange)
}

export interface FieldInformation {
  parentType: string
  name: string
  type: string
  isArray?: boolean
  isRequired?: boolean
  isScalar?: boolean
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

function topOperation(query: string) {
  const formatted = query
    .split(/\s+/)
    .filter(i => i !== '')
    .join('')
  if (/^query/.test(formatted)) return gql.OperationTypeNode.QUERY
  if (/^mutation/.test(formatted)) return gql.OperationTypeNode.MUTATION
  if (/^subscription/.test(formatted)) return gql.OperationTypeNode.SUBSCRIPTION
  return gql.OperationTypeNode.QUERY
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
    let schemaType: gql.GraphQLObjectType = schema.getRootType(
      topOperation(query),
    ) as gql.GraphQLObjectType
    const typeInfo = new gql.TypeInfo(schema)
    gql.visit(
      document,
      gql.visitWithTypeInfo(typeInfo, {
        enter(node) {
          if (isSelectionSetNode(node)) {
            if (isInRange(node, position, offset)) {
              const type = typeInfo.getType()
              if (gql.isObjectType(type)) {
                schemaType = type
              }
            }
          }
        },
      }),
    )
    if (!gql.isObjectType(schemaType)) return []
    const fields = schemaType.getFields()
    return Object.values(fields).map(field => ({
      parentType: schemaType.name,
      name: field.name,
      type: gql.getNamedType(field.type).name,
      isArray: gql.isListType(gql.getNullableType(field.type)),
      isNullable: gql.isNullableType(field.type),
    }))
  } catch (e) {
    console.error(e)
    return []
  }
}
