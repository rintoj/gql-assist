import ts from 'typescript'

export function getName(node: ts.Node) {
  return (node as any)?.name && ts.isIdentifier((node as any).name)
    ? (node as any).name.text
    : undefined
}
