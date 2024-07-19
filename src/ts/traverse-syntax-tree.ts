import ts from 'typescript'
import { SyntaxKindToDeclaration } from './syntax-kind-to-declaration'

export function getChildren(node: ts.Node) {
  const children: ts.Node[] = []
  if (node) {
    ts.forEachChild(node, child => {
      children.push(child)
    })
  }
  return children
}

export function traverseSyntaxTree<T extends ts.Node>(
  node: ts.Node,
  filter: (node: ts.Node, depth: number) => boolean,
  depth = 0,
): T | undefined {
  const children = getChildren(node)
  for (const child of children) {
    if (filter(child, depth)) {
      return child as T
    }
    const value = traverseSyntaxTree<T>(child, filter, depth + 1)
    if (value) {
      return value as T
    }
  }
}

export function printSyntaxTree(node: ts.Node) {
  traverseSyntaxTree(node, (node: ts.Node, depth: number) => {
    console.log(new Array(depth + 1).fill('--').join('') + ' ' + ts.SyntaxKind[node.kind])
    return false
  })
}

export type Traverser = {
  [K in keyof SyntaxKindToDeclaration]?: (
    node: SyntaxKindToDeclaration[K],
  ) => boolean | null | undefined
}

export function traverse<T>(node: ts.Node, traverser: Traverser) {
  function visitNode(node: ts.Node): boolean {
    const callback = (traverser as any)[node.kind]
    if (callback) {
      return callback(node) === true
    }
    return ts.forEachChild(node, visitNode) === true
  }
  visitNode(node)
}
