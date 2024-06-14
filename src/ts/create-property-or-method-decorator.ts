import ts, { factory } from 'typescript'
import { Context } from '../generator/context'
import { createImport } from './create-import'
import { getComment } from './get-comment'
import { getCommentFromDecorator } from './get-comment-from-decorator'
import { getTypeFromDecorator, getType } from './get-type'
import { isNullable } from './is-nullable'
import { isNullableFromDecorator } from './is-nullable-from-decorator'

export function createPropertyOrMethodDecorator(
  node: ts.PropertyDeclaration | ts.MethodDeclaration,
  decoratorName: 'Query' | 'Mutation' | 'Field' | 'ResolveField',
  context: Context,
) {
  const argumentsArray: ts.Expression[] = []
  context.imports.push(createImport(context.config.behaviour.serverLibrary, decoratorName))
  const comment = getComment(node) ?? getCommentFromDecorator(node, decoratorName)
  const type =
    getType(node, context.config.behaviour.defaultNumberType) ??
    getTypeFromDecorator(node, decoratorName)
  if (type && !['string', 'boolean'].includes(type)) {
    argumentsArray.push(
      factory.createArrowFunction(
        undefined,
        undefined,
        [],
        undefined,
        factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
        factory.createIdentifier(type),
      ),
    )
    if (['ID', 'Int', 'Float'].includes(type))
      context.imports.push(createImport(context.config.behaviour.serverLibrary, type))
  }

  const isNull =
    decoratorName === 'Field'
      ? isNullable(node, context.config.behaviour.nullableByDefault)
      : isNullableFromDecorator(node) ||
        isNullable(node, context.config.behaviour.nullableByDefault)

  if (isNull || !!comment) {
    argumentsArray.push(
      factory.createObjectLiteralExpression(
        [
          isNull
            ? factory.createPropertyAssignment(
                factory.createIdentifier('nullable'),
                factory.createTrue(),
              )
            : (undefined as any),
          comment
            ? factory.createPropertyAssignment(
                factory.createIdentifier('description'),
                factory.createStringLiteral(comment),
              )
            : (undefined as any),
        ].filter(i => !!i),
        false,
      ),
    )
  }

  return factory.createDecorator(
    factory.createCallExpression(
      factory.createIdentifier(decoratorName),
      undefined,
      argumentsArray,
    ),
  )
}
