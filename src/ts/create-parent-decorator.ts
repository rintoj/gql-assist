import { factory } from 'typescript'
import { Context } from '../generator/context'
import { createImport } from './create-import'

export function createParentDecorator(context: Context) {
  context.imports.push(createImport(context.config.behaviour.serverLibrary, 'Parent'))
  return factory.createDecorator(
    factory.createCallExpression(factory.createIdentifier('Parent'), undefined, undefined),
  )
}
