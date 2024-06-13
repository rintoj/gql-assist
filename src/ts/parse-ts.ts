import { readFileSync } from 'fs-extra'
import { basename } from 'path'
import ts from 'typescript'

export function parseTSFile(filePath: string, content = '') {
  return ts.createSourceFile(
    basename(filePath),
    content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
}

export function readTSFile(filePath: string) {
  return parseTSFile(filePath, readFileSync(filePath, 'utf8'))
}

export function parseTS(content = '') {
  return ts.createSourceFile('', content, ts.ScriptTarget.Latest, false, ts.ScriptKind.TSX)
}
