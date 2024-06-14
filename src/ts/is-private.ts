import ts from 'typescript'

export function isPrivate(node: ts.Node) {
  return (
    (node as any)?.modifiers?.find(
      modifier =>
        [ts.SyntaxKind.PrivateKeyword, ts.SyntaxKind.ProtectedKeyword].indexOf(modifier.kind) >= 0,
    ) != undefined
  )
}
