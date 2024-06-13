import ts from 'typescript'

export function withDefaultType(
  node: ts.ParameterDeclaration | ts.MethodDeclaration | ts.PropertyDeclaration,
  type: ts.TypeNode,
) {
  return { ...node, type: node.type ?? type }
}
