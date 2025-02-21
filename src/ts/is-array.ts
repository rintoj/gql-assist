import ts from 'typescript'

export function isArrayType(
  node: ts.PropertyDeclaration | ts.MethodDeclaration | ts.ParameterDeclaration,
): boolean {
  return !!node.type && ts.isArrayTypeNode(node.type)
}
