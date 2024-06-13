import ts from 'typescript'

export function getComment(node: ts.Node) {
  return (node as any)?.jsDoc
    ?.map((doc: { comment?: string }) => doc.comment)
    .filter((comment: string | undefined) => !!comment)
    .join('\n')
}
