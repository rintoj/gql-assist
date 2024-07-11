import ts from 'typescript'
import { findNode } from './find-node'

const names = ['gql', 'graphql']

export function getGraphQLQueryVariable(sourceFile: ts.SourceFile) {
  return findNode(
    sourceFile,
    node =>
      ts.isVariableDeclaration(node) &&
      !!node.initializer &&
      ts.isTaggedTemplateExpression(node.initializer) &&
      ts.isIdentifier(node.initializer.tag) &&
      names.includes(node.initializer.tag.escapedText ?? ''),
  ) as ts.VariableDeclaration
}

export function getExistingHookName(sourceFile: ts.SourceFile) {
  const hook = findNode<ts.FunctionDeclaration>(
    sourceFile,
    node =>
      ts.isFunctionDeclaration(node) &&
      !!node.name &&
      ts.isIdentifier(node.name) &&
      !!node.name.text &&
      node.name.text.startsWith('use'),
  )
  if (!hook || !hook.name || !ts.isIdentifier(hook.name)) return
  return hook.name.text
}
