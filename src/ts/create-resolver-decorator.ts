import ts, { factory } from 'typescript'
import { Context } from '../generator/context'
import { createImport } from './create-import'

export function createResolverDecorator(type: string, addType: boolean, context: Context) {
  context.imports.push(createImport(context.config.behaviour.serverLibrary, 'Resolver'))
  return factory.createDecorator(
    factory.createCallExpression(
      factory.createIdentifier('Resolver'),
      undefined,
      addType
        ? [
            factory.createArrowFunction(
              undefined,
              undefined,
              [],
              undefined,
              factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
              factory.createIdentifier(type),
            ),
          ]
        : undefined,
    ),
  )
}
