import ts from 'typescript'
import { Context } from '../generator/context'
import { createImport } from './create-import'
import { getComment } from './get-comment'
import { getCommentFromDecorator } from './get-comment-from-decorator'

export function createClassDecorator(
  node: ts.ClassDeclaration,
  name: 'ObjectType' | 'InputType',
  context: Context,
) {
  const comment = getComment(node) ?? getCommentFromDecorator(node, name)
  const argumentsArray: ts.Expression[] = []
  if (!!comment) {
    argumentsArray.push(
      ts.factory.createObjectLiteralExpression(
        [
          ts.factory.createPropertyAssignment(
            ts.factory.createIdentifier('description'),
            ts.factory.createStringLiteral(comment),
          ),
        ],
        false,
      ),
    )
  }
  context.imports.push(createImport('@nestjs/graphql', name))
  return ts.factory.createDecorator(
    ts.factory.createCallExpression(ts.factory.createIdentifier(name), undefined, argumentsArray),
  )
}
