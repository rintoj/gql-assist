import * as gql from 'graphql'
import { Position, Range } from '../diff'
import { getGQLNodeRange } from '../gql'

export function isPositionWithInRange(position: Position, range: Range, includeEdges = false) {
  if (position.line > range.start.line && position.line < range.end.line) {
    return true
  }

  if (position.line === range.start.line && position.line === range.end.line) {
    if (includeEdges) {
      return (
        position.character >= range.start.character && position.character <= range.end.character
      )
    } else {
      return position.character > range.start.character && position.character < range.end.character
    }
  }
  if (position.line === range.start.line) {
    if (includeEdges) {
      return position.character >= range.start.character
    } else {
      return position.character > range.start.character
    }
  }
  if (position.line === range.end.line) {
    if (includeEdges) {
      return position.character <= range.end.character
    } else {
      return position.character < range.end.character
    }
  }
  return false
}

export function isInRange(
  node: gql.ASTNode,
  position: Position,
  offset?: Position,
  includeEdges = true,
) {
  const nodeRange = getGQLNodeRange(node, offset)
  return isPositionWithInRange(position, nodeRange, includeEdges)
}
