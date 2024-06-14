import ts from 'typescript'

export const EMPTY_LINE = '__AUTO_GENERATED_EMPTY_LINE__'

export function addEmptyLineBefore<T extends ts.Node>(node: T): T {
  return ts.addSyntheticLeadingComment(
    node,
    ts.SyntaxKind.SingleLineCommentTrivia,
    EMPTY_LINE,
    true,
  )
}

export function addEmptyLineAfter<T extends ts.Node>(node: T): T {
  return ts.addSyntheticTrailingComment(
    node,
    ts.SyntaxKind.SingleLineCommentTrivia,
    EMPTY_LINE,
    true,
  )
}

export function addEmptyLineBeforeAndAfter<T extends ts.Node>(node: T): T {
  return addEmptyLineBefore(addEmptyLineAfter(node))
}
