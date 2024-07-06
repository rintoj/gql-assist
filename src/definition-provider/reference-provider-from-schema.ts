import * as gql from 'graphql'
import { Position, Range } from '../diff'
import { getGQLNodeRange, getGQLNodeRangeWithoutDescription, makeQueryParsable } from '../gql'
import { isPositionWithInRange } from '../position/is-position-within-range'

function isInRange(node: gql.ASTNode, position: Position, offset?: Position) {
  const nodeRange = getGQLNodeRange(node, offset)
  return isPositionWithInRange(position, nodeRange, true)
}

export function provideReferenceFromSchema(source: string, position: Position) {
  try {
    const fixed = makeQueryParsable(source)
    const document = gql.parse(fixed)
    let selectedName: string | undefined
    const processNode = (node: gql.TypeDefinitionNode | gql.NamedTypeNode) => {
      if (!isInRange(node, position)) return
      selectedName = node.name.value
    }
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
      NamedType(node) {
        return processNode(node)
      },
    })
    if (!selectedName) return []
    const ranges: Range[] = []
    gql.visit(document, {
      NamedType(node) {
        if (node.name.value !== selectedName) return
        ranges.push(getGQLNodeRangeWithoutDescription(node))
      },
    })
    return ranges
  } catch (e) {
    console.error(e)
    return []
  }
}
