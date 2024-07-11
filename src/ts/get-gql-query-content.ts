import ts from 'typescript'

const names = ['gql', 'graphql']

export function getGQLContent(node: ts.VariableDeclaration) {
  if (ts.isVariableDeclaration(node) && !!node.initializer) {
    if (
      ts.isTaggedTemplateExpression(node.initializer) &&
      ts.isIdentifier(node.initializer.tag) &&
      names.includes(node.initializer.tag.escapedText ?? '')
    ) {
      return node.initializer.template.getText().split('`').join('')
    } else if (ts.isNoSubstitutionTemplateLiteral(node.initializer)) {
      return node.initializer.text.split('`').join('')
    } else if (ts.isStringLiteral(node.initializer)) {
      return node.initializer.text.split('`').join('')
    }
  }
}
