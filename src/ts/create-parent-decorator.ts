import { factory } from 'typescript'
import { Context } from '../gql/context'
import { createImport } from './create-import'

export function createParentDecorator(context: Context) {
  context.imports.push(createImport('@nestjs/graphql', 'Parent'))
  return factory.createDecorator(
    factory.createCallExpression(factory.createIdentifier('Parent'), undefined, undefined),
  )
}
