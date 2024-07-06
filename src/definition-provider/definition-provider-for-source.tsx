import * as gql from 'graphql'
import ts from 'typescript'
import { Position } from '../diff'
import { getGQLNodeRange, getGQLNodeRangeWithoutDescription, makeQueryParsable } from '../gql'
import { isPositionWithInRange } from '../position/is-position-within-range'
import { getGQLContent, getGraphQLQueryVariable, getTSNodeLocationRange } from '../ts'

function isInRange(node: gql.ASTNode, position: Position, offset?: Position) {
  const nodeRange = getGQLNodeRange(node, offset)
  return isPositionWithInRange(position, nodeRange, true)
}

export function provideDefinitionForSource(
  sourceFile: ts.SourceFile,
  position: Position,
  schema: gql.GraphQLSchema,
) {
  const variable = getGraphQLQueryVariable(sourceFile)
  if (!variable) return null

  const range = getTSNodeLocationRange(variable, sourceFile)
  const query = getGQLContent(variable)
  if (!query || query?.trim() === '') return null
  const offset = new Position(range.start.line, 0)

  try {
    const fixed = makeQueryParsable(query)
    const document = gql.parse(fixed)
    let targetNode: gql.ASTNode | undefined | null
    const typeInfo = new gql.TypeInfo(schema)
    gql.visit(
      document,
      gql.visitWithTypeInfo(typeInfo, {
        OperationDefinition(node) {
          if (!isInRange(node, position, offset)) return
          const type = typeInfo.getType()
          targetNode = gql.getNamedType(type)?.astNode
        },
        VariableDefinition(node) {
          if (!isInRange(node, position, offset)) return
          const type = typeInfo.getInputType()
          targetNode = gql.getNamedType(type)?.astNode
        },
        Field(node) {
          if (!isInRange(node, position, offset)) return
          const type = typeInfo.getParentType()
          if (!type || !gql.isObjectType(type)) return
          targetNode = type?.getFields()[node.name.value]?.astNode
        },
      }),
    )
    if (!targetNode) return null
    return getGQLNodeRangeWithoutDescription(targetNode)
  } catch (e) {
    console.error(e)
    return null
  }
}
