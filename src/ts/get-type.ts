import ts from 'typescript'
import { NumericType } from '../config'
import { getAllTypes } from './get-all-types'
import { getDecorator } from './get-decorator'
import { getName } from './get-name'
import { getTypeChecker } from './get-type-checker'
import { Context } from '../generator'
import { isArrayType } from './is-array'

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
  defaultNumericType: NumericType,
) {
  const typeFromDecorator = getTypeFromDecorator(node, 'Field')
  if (typeFromDecorator) return typeFromDecorator
  if (getName(node) === 'id') return 'ID'
  const [type, secondType] = Array.from(new Set(getAllTypes(node.type))).filter(
    i => !['null', 'undefined', 'Promise'].includes(i),
  )
  if (secondType) throw new Error('Return type can not be a union type.')
  if (type === 'string') return
  if (type === 'number') return defaultNumericType
  if (type) return type
}

export function getPropertyOrMethodType(
  node: ts.PropertyDeclaration | ts.MethodDeclaration,
  defaultType: string,
): string {
  if (node.type) {
    const type = node.type.getText()
    if (isArrayType(node)) return type.replace('[]', '')
    return type
  }
  if (ts.isMethodDeclaration(node) && node.typeParameters && node.typeParameters.length > 0) {
    return defaultType
  }
  return defaultType
}
