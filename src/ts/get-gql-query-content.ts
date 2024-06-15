import ts from 'typescript'

export function getGQLContent(node: ts.VariableDeclaration) {
  if (ts.isVariableDeclaration(node) && !!node.initializer) {
    if (
      ts.isTaggedTemplateExpression(node.initializer) &&
      ts.isIdentifier(node.initializer.tag) &&
      node.initializer.tag.escapedText === 'gql'
    ) {
      return node.initializer.template.getText().split('`').join('')
    } else if (ts.isNoSubstitutionTemplateLiteral(node.initializer)) {
      return node.initializer.text.split('`').join('')
    } else if (ts.isStringLiteral(node.initializer)) {
      return node.initializer.text.split('`').join('')
    }
  }
}
