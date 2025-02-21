import ts from 'typescript'

export function isPrimitiveType(node: ts.TypeNode): boolean {
  switch (node.kind) {
    case ts.SyntaxKind.StringKeyword:
    case ts.SyntaxKind.NumberKeyword:
    case ts.SyntaxKind.BooleanKeyword:
    case ts.SyntaxKind.VoidKeyword:
    case ts.SyntaxKind.NullKeyword:
    case ts.SyntaxKind.UndefinedKeyword:
    case ts.SyntaxKind.SymbolKeyword:
    case ts.SyntaxKind.BigIntKeyword:
      return true
    default:
      return false
  }
}
