import ts from 'typescript'
import { getAllTypes } from './get-all-types'
import { getDecorator } from './get-decorator'
import { getName } from './get-name'

export function getTypeFromDecorator(node: ts.Node, name: string) {
  const decorator = getDecorator(node, name)
  if (!decorator || !ts.isDecorator(decorator)) return
  if (ts.isCallExpression(decorator.expression)) {
    const arrowFunction = decorator.expression.arguments.find(ts.isArrowFunction)
    if (arrowFunction && ts.isIdentifier(arrowFunction.body)) {
      return arrowFunction.body.text
    } else if (
      arrowFunction &&
      ts.isArrayLiteralExpression(arrowFunction.body) &&
      ts.isIdentifier(arrowFunction.body.elements?.[0])
    ) {
      return `[${arrowFunction.body.elements[0].text}]`
    }
  }
}

export function getType(
  node: ts.PropertyDeclaration | ts.ParameterDeclaration | ts.MethodDeclaration,
) {
  const typeFromDecorator = getTypeFromDecorator(node, 'Field')
  if (typeFromDecorator) return typeFromDecorator
  if (getName(node) === 'id') return 'ID'
  const [type, secondType] = Array.from(new Set(getAllTypes(node.type))).filter(
    i => !['null', 'undefined', 'Promise'].includes(i),
  )
  if (secondType) throw new Error('Return type can not be a union type.')
  if (type === 'string') return
  if (type === 'number') return 'Int'
  if (type) return type
}
