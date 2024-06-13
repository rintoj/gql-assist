import ts from 'typescript'
import { getDecorator } from './get-decorator'
import { getImplementationByName } from './get-implementation-by-name'

export function getCommentFromDecorator(node: ts.Node, name: string) {
  const decorator = getDecorator(node, name)
  if (!decorator || !ts.isDecorator(decorator)) return
  if (ts.isCallExpression(decorator.expression)) {
    const option = decorator.expression.arguments.find(ts.isObjectLiteralExpression)
    if (option) {
      const description = option.properties
        .filter(ts.isPropertyAssignment)
        .find(prop => (ts.isIdentifier(prop.name) ? prop.name.text === 'description' : false))
      return description?.initializer && ts.isStringLiteral(description?.initializer)
        ? description?.initializer.text
        : undefined
    }
  }
}

export function hasImplementationByName(node: ts.ClassDeclaration, name: string) {
  return !!getImplementationByName(node, name)
}
