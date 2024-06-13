import { factory } from 'typescript'

export function createContextDecorator() {
  return factory.createDecorator(
    factory.createCallExpression(factory.createIdentifier('Context'), undefined, undefined),
  )
}
