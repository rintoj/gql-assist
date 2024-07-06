import * as gql from 'graphql'
import { Position } from '../diff'
import { getGQLNodeRange, getGQLNodeRangeWithoutDescription, makeQueryParsable } from '../gql'
import { isPositionWithInRange } from '../position/is-position-within-range'

function isInRange(node: gql.ASTNode, position: Position, offset?: Position) {
  const nodeRange = getGQLNodeRange(node, offset)
  return isPositionWithInRange(position, nodeRange, true)
}

export function provideDefinitionForSchema(source: string, position: Position) {
  try {
    const fixed = makeQueryParsable(source)
    const document = gql.parse(fixed)
    let selectedName: string | undefined
    let targetNode: gql.ASTNode | undefined
    gql.visit(document, {
      NamedType(node) {
        if (!isInRange(node, position)) return
        selectedName = node.name.value
      },
    })
    const processNode = (node: gql.TypeDefinitionNode) => {
      if (node.name.value !== selectedName) return
      targetNode = node
      return gql.BREAK
    }
    if (!selectedName) return null
    gql.visit(document, {
      EnumTypeDefinition(node) {
        return processNode(node)
      },
      ScalarTypeDefinition(node) {
        return processNode(node)
      },
      ObjectTypeDefinition(node) {
        return processNode(node)
      },
      InputObjectTypeDefinition(node) {
        return processNode(node)
      },
      UnionTypeDefinition(node) {
        return processNode(node)
      },
      InterfaceTypeDefinition(node) {
        return processNode(node)
      },
    })
    if (!targetNode) return null
    return getGQLNodeRangeWithoutDescription(targetNode)
  } catch (e) {
    console.error(e)
    return null
  }
}
