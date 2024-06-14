import ts from 'typescript'

export function isAsync(node: ts.Node) {
  return (node as any)?.modifiers?.some((i: any) => i.kind === ts.SyntaxKind.AsyncKeyword)
}
