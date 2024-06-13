import { toNonNullArray } from 'tsds-tools'
import ts, { factory } from 'typescript'
import { Context } from '../gql/context'
import { createImport } from './create-import'
import { getName } from './get-name'
import { getType, isNullable } from './gql-util'
import { getTypeFromDecorator } from './get-type-from-decorator'

export function createArgsDecorator(node: ts.ParameterDeclaration, context: Context) {
  context.imports.push(createImport('@nestjs/graphql', 'Args'))
  const name = getName(node)
  const type = getType(node) ?? getTypeFromDecorator(node, 'Args')
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
          isNullable(node)
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
    if (isNullable(node)) {
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
    context.imports.push(createImport('@nestjs/graphql', type))
  }
  return factory.createDecorator(
    factory.createCallExpression(factory.createIdentifier('Args'), undefined, argumentsArray),
  )
}
