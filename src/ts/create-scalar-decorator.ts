import ts, { factory } from 'typescript'
import { Context } from '../gql/context'
import { createImport } from './create-import'

export function createScalarDecorator(node: ts.ClassDeclaration, context: Context) {
  context.imports.push(createImport(context.config.behaviour.serverLibrary, 'Scalar'))
  const name = node.name && ts.isIdentifier(node.name) ? node.name.text : ''
  const argumentsArray: ts.Expression[] = [
    factory.createStringLiteral(name),
    factory.createArrowFunction(
      undefined,
      undefined,
      [],
      undefined,
      factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
      factory.createIdentifier('String'),
    ),
  ]
  return factory.createDecorator(
    factory.createCallExpression(factory.createIdentifier('Scalar'), undefined, argumentsArray),
  )
}
