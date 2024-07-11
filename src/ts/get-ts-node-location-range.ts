import ts from 'typescript'
import { Position, Range } from '../position'

export function getTSNodeLocationRange(node: ts.Node, sourceFile: ts.SourceFile) {
  const start = node.getStart(sourceFile)
  const end = node.getEnd()
  const startPos = ts.getLineAndCharacterOfPosition(sourceFile, start)
  const endPos = ts.getLineAndCharacterOfPosition(sourceFile, end)
  return new Range(
    new Position(startPos.line, startPos.character),
    new Position(endPos.line, endPos.character),
  )
}
