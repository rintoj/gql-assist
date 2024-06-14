import ts from 'typescript'

export function removeNullability<T extends ts.PropertyDeclaration | ts.MethodDeclaration>(
  node: T,
): T {
  return {
    ...node,
    questionToken: undefined,
    exclamationToken: undefined,
  }
}
