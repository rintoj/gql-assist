import * as gql from 'graphql'
import { toNonNullArray } from 'tsds-tools'
import ts from 'typescript'
import { GQLAssistConfig } from '../config'
import { Position } from '../position'
import { isFieldNode } from '../gql'
import { getGQLNodeRange } from '../gql/get-gql-node-location-range'
import { isPositionWithInRange } from '../position'
import { parseGraphQLDocumentFromTS } from '../ts'

export const DEFAULT_SIPPET = '{\n  ${1}\n}'

function isInRange(node: gql.ASTNode, position: Position, offset?: Position) {
  const nodeRange = getGQLNodeRange(node, offset)
  return isPositionWithInRange(position, nodeRange)
}

export interface FieldInformation {
  parentType: string
  name: string
  type: string
  isArray: boolean
  isNullable: boolean
  isSelectable: boolean
  insertText: string
  documentation: string
}

const topLevelInfo = (schema: gql.GraphQLSchema): FieldInformation[] =>
  [
    gql.OperationTypeNode.QUERY,
    gql.OperationTypeNode.MUTATION,
    gql.OperationTypeNode.SUBSCRIPTION,
  ].map(name => ({
    parentType: 'GraphQL',
    name,
    type: 'Operation',
    isArray: false,
    isNullable: false,
    isSelectable: true,
    insertText: `${name} ${DEFAULT_SIPPET}`,
    documentation: getSource(schema.getRootType(name)?.astNode),
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

export function autoCompleteHook(
  sourceFile: ts.SourceFile,
  position: Position,
  schema: gql.GraphQLSchema,
  config: GQLAssistConfig,
): FieldInformation[] {
  try {
    const { variable, document, source, offset } = parseGraphQLDocumentFromTS(sourceFile, {
      position,
    })
    if (!variable) return []
    if (!source || isEmptyQuery(source) || !document) return topLevelInfo(schema)

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
          const isSelectable = !gql.isScalarType(nullableType) && !gql.isEnumType(nullableType)
          const namedType = gql.getNamedType(field.type)
          if (!schemaType) return
          return {
            parentType: schemaType.name,
            name: field.name,
            type: namedType.name,
            isNullable: gql.isNullableType(field.type),
            isArray: gql.isListType(nullableType),
            isSelectable,
            insertText: isSelectable ? `${field.name} ${DEFAULT_SIPPET}` : field.name,
            documentation: namedType.description ?? getSource(namedType.astNode),
          }
        }),
    )
  } catch (e) {
    console.error(e)
    return []
  }
}

function getSource(node: gql.ASTNode | null | undefined) {
  if (!node?.loc) return ''
  return ['```graphql', node.loc.source.body.substring(node.loc.start, node.loc.end), '```'].join(
    '\n',
  )
}
