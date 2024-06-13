import ts from 'typescript'

export function addExport<T extends ts.ClassDeclaration | ts.PropertyDeclaration | undefined>(
  node: T,
): T {
  if (!node) return node
  return {
    ...node,
    modifiers: [...(node.modifiers ?? []), ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
  }
}
