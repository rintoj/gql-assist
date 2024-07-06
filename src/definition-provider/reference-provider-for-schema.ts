import * as gql from 'graphql'
import { Position, Range } from '../diff'
import { getGQLNodeRange, getGQLNodeRangeWithoutDescription, makeQueryParsable } from '../gql'
import { isPositionWithInRange } from '../position/is-position-within-range'

function isInRange(node: gql.ASTNode, position: Position, offset?: Position) {
  const nodeRange = getGQLNodeRange(node, offset)
  return isPositionWithInRange(position, nodeRange, true)
}

export function provideReferenceForSchema(source: string, position: Position) {
  try {
    const fixed = makeQueryParsable(source)
    const document = gql.parse(fixed)
    let selectedName: string | undefined
    const processNode = (node: gql.NameNode | gql.NamedTypeNode) => {
      if (!isInRange(node, position)) return
      selectedName = node.kind === gql.Kind.NAME ? node.value : node.name.value
    }
    gql.visit(document, {
      Name(node) {
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
