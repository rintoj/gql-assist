import { Position, Range } from '../diff'

export function isPositionWithInRange(position: Position, range: Range) {
  if (position.line > range.start.line && position.line < range.end.line) {
    return true
  }
  if (position.line == range.start.line) {
    return position.character >= range.start.character
  }
  if (position.line == range.end.line) {
    return position.character <= range.end.character
  }
  return false
}
