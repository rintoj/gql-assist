import ts from 'typescript'

export function isPrimitiveType(node: ts.PropertyDeclaration | ts.MethodDeclaration): boolean {
  switch (node.type?.kind) {
    case ts.SyntaxKind.StringKeyword:
    case ts.SyntaxKind.NumberKeyword:
    case ts.SyntaxKind.BooleanKeyword:
    case ts.SyntaxKind.VoidKeyword:
    case ts.SyntaxKind.NullKeyword:
    case ts.SyntaxKind.UndefinedKeyword:
    case ts.SyntaxKind.SymbolKeyword:
    case ts.SyntaxKind.BigIntKeyword:
      return true
    case ts.SyntaxKind.ArrayType:
      return isPrimitiveType(
        (node.type as ts.ArrayTypeNode).elementType as unknown as ts.PropertyDeclaration,
      )
    default:
      return false
  }
}
