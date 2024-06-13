import ts from 'typescript'
import { getName } from './get-name'

export function convertToMethod(node: ts.PropertyDeclaration | ts.MethodDeclaration) {
  const name = getName(node)
  if (ts.isMethodDeclaration(node)) return node
  if (ts.isPropertyDeclaration(node) && node.type && ts.isFunctionTypeNode(node.type)) {
    return ts.factory.createMethodDeclaration(
      undefined,
      undefined,
      ts.factory.createIdentifier(name),
      undefined,
      undefined,
      node.type.parameters,
      undefined,
      ts.factory.createBlock([], true),
    )
  }
}
