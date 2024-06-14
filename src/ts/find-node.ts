import ts from 'typescript'
import { traverseSyntaxTree } from './traverse-syntax-tree'

export type FindFilterType = ((node: ts.Node) => boolean) | ts.SyntaxKind

export function findNode<T>(node: ts.Node | undefined, ...filters: FindFilterType[]) {
  let nextNode: ts.Node | undefined = node
  for (const filter of filters) {
    if (!nextNode) {
      return
    }
    nextNode = traverseSyntaxTree(
      nextNode,
      typeof filter === 'function' ? filter : node => node.kind === filter,
    )
  }
  return nextNode as any as T
}
