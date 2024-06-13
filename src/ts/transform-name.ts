import ts from 'typescript'

export function transformName<
  T extends ts.PropertyDeclaration | ts.ParameterDeclaration | ts.MethodDeclaration | undefined,
>(node: T, transform: (name: string) => string): T {
  if (!node) return undefined as T
  if (node.name && ts.isIdentifier(node.name)) {
    return { ...node, name: ts.factory.createIdentifier(transform(node.name.text)) } as T
  }
  return node
}
