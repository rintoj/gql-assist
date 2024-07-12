import * as gql from 'graphql'
import { Position, Range } from '../position'

export function getGQLNodeRangeWithoutDescription(node: gql.ASTNode, offset?: Position) {
  const range = getGQLNodeRange(node)
  if ((node as any).description) {
    const line = (node as any).description?.loc?.endToken?.next?.line
    return { ...range, start: { ...range.start, line: line - 1 } } as Range
  }
  return range
}

export function getGQLNodeRange(node: gql.ASTNode, offset?: Position) {
  const { loc } = node
  if (!loc) {
    return new Range(
      new Position(offset?.line ?? 0, offset?.character ?? 0),
      new Position(offset?.line ?? 0, offset?.character ?? 1),
    )
  }
  return new Range(
    new Position(
      loc.startToken.line + (offset?.line ?? 0) - 1,
      loc.startToken.column + (offset?.character ?? 0) - 1,
    ),
    new Position(
      loc.endToken.line + (offset?.line ?? 0) - 1,
      loc.endToken.column + loc.endToken.end - loc.endToken.start + (offset?.character ?? 0),
    ),
  )
}
