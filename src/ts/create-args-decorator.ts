import { toNonNullArray } from 'tsds-tools'
import ts, { factory } from 'typescript'
import { Context } from '../generator/context'
import { createImport } from './create-import'
import { getName } from './get-name'
import { getType, getTypeFromDecorator } from './get-type'
import { isNullable } from './is-nullable'

export function createArgsDecorator(node: ts.ParameterDeclaration, context: Context) {
  context.imports.push(createImport(context.config.behaviour.serverLibrary, 'Args'))
  const name = getName(node)
  const type =
    getType(node, context.config.behaviour.defaultNumberType) ?? getTypeFromDecorator(node, 'Args')
  const argumentsArray: ts.Expression[] = []
  if (type && !['string', 'boolean'].includes(type)) {
    argumentsArray.push(
      factory.createObjectLiteralExpression(
        toNonNullArray([
          factory.createPropertyAssignment(
            factory.createIdentifier('name'),
            factory.createStringLiteral(name),
          ),
          factory.createPropertyAssignment(
            factory.createIdentifier('type'),
            factory.createArrowFunction(
              undefined,
              undefined,
              [],
              undefined,
              factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
              factory.createIdentifier(type),
            ),
          ),
          isNullable(node, context.config.behaviour.nullableByDefault)
            ? factory.createPropertyAssignment(
                factory.createIdentifier('nullable'),
                factory.createTrue(),
              )
            : (undefined as any),
        ]),
      ),
    )
  } else {
    argumentsArray.push(factory.createStringLiteral(name))
    if (isNullable(node, context.config.behaviour.nullableByDefault)) {
      argumentsArray.push(
        factory.createObjectLiteralExpression(
          [
            factory.createPropertyAssignment(
              factory.createIdentifier('nullable'),
              factory.createTrue(),
            ),
          ],
          false,
        ),
      )
    }
  }
  if (type && ['ID', 'INT'].includes(type)) {
    context.imports.push(createImport(context.config.behaviour.serverLibrary, type))
  }
  return factory.createDecorator(
    factory.createCallExpression(factory.createIdentifier('Args'), undefined, argumentsArray),
  )
}
