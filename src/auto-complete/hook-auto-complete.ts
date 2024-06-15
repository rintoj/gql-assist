import * as gql from 'graphql'
import { toClassName } from 'name-util'
import { toNonNullArray } from 'tsds-tools'
import ts from 'typescript'
import { GQLAssistConfig } from '../config'
import { Position } from '../diff'
import { getFieldFromTypeDefinition, getFieldType, getTypeDefinition } from '../gql'
import { getGQLNodeLocationRange } from '../gql/get-gql-node-location-range'
import { isPositionWithInRange } from '../position'
import { getGQLContent, getGraphQLQueryVariable, getTSNodeLocationRange } from '../ts'

function getParents(
  path: (string | number)[],
  ancestors: (gql.ASTNode | readonly gql.ASTNode[])[],
) {
  return toNonNullArray(
    path.map((i, index) => (/\d+/.test(`${i}`) ? ancestors[index]?.[i] : undefined)),
  )
}

function resolveParentType(parents: gql.ASTNode[], schema: gql.DocumentNode) {
  return parents.reduce((parentType: gql.ObjectTypeDefinitionNode | undefined, parent) => {
    if (parent.kind === gql.Kind.OPERATION_DEFINITION) {
      return getTypeDefinition(schema, toClassName(parent.operation))
    }
    if (parent.kind === gql.Kind.FIELD && parentType) {
      const field = getFieldFromTypeDefinition(parentType, parent.name.value)
      return field ? getFieldType(schema, field) : undefined
    }
    return parentType
  }, undefined)
}

export function autoCompleteHook(
  sourceFile: ts.SourceFile,
  position: Position,
  schema: gql.DocumentNode,
  config: GQLAssistConfig,
): string[] {
  const variable = getGraphQLQueryVariable(sourceFile)
  if (!variable) return []

  const range = getTSNodeLocationRange(variable, sourceFile)
  if (!isPositionWithInRange(position, range)) return []

  const graphQLQueryString = getGQLContent(variable)
  if (!graphQLQueryString || graphQLQueryString?.trim() === '') return []

  const offset = new Position(range.start.line, 0)

  try {
    const document = gql.parse(graphQLQueryString)
    let definition: gql.ObjectTypeDefinitionNode | undefined
    gql.visit(document, {
      Field: (node, key, parent, path, ancestors) => {
        const nodeRange = getGQLNodeLocationRange(node, offset)
        if (isPositionWithInRange(position, nodeRange)) {
          const parents = getParents([...path], [...ancestors])
          definition = resolveParentType(parents, schema) ?? definition
        }
      },
    })
    return definition?.fields?.map(i => i.name.value) ?? []
  } catch (e) {
    return []
  }
}
