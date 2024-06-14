import ts from 'typescript'
import { parseTSFile } from './parse-ts'

const printerOptions: ts.PrinterOptions = {
  newLine: ts.NewLineKind.LineFeed,
  omitTrailingSemicolon: false,
}

export function printTS(
  node: ts.Node | undefined,
  sourceFile: ts.SourceFile = parseTSFile('./test.ts', ''),
  options?: ts.PrinterOptions,
) {
  if (!node) return ''
  return ts
    .createPrinter({ ...printerOptions, ...options }, {})
    .printNode(ts.EmitHint.Unspecified, node, sourceFile)
}
