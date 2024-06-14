import ts from 'typescript'

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
