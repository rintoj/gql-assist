import ts from 'typescript'
import { findNode } from './find-node'

export function getGraphQLQueryVariable(sourceFile: ts.SourceFile) {
  return findNode(
    sourceFile,
    node =>
      ts.isVariableDeclaration(node) &&
      !!node.initializer &&
      ((ts.isTaggedTemplateExpression(node.initializer) &&
        ts.isIdentifier(node.initializer.tag) &&
        node.initializer.tag.escapedText === 'gql') ||
        ts.isNoSubstitutionTemplateLiteral(node.initializer) ||
        ts.isStringLiteral(node.initializer)),
  ) as ts.VariableDeclaration
}
