import { Position, Range } from '../diff'

export function isPositionWithInRange(position: Position, range: Range, includeEdges = false) {
  if (position.line > range.start.line && position.line < range.end.line) {
    return true
  }

  if (position.line == range.start.line) {
    if (includeEdges) {
      return position.character >= range.start.character
    } else {
      return position.character > range.start.character
    }
  }
  if (position.line == range.end.line) {
    if (includeEdges) {
      return position.character <= range.end.character
    } else {
      return position.character < range.end.character
    }
  }
  return false
}
