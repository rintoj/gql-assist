import ts from 'typescript'
import { isNullable } from './is-nullable'

export function addNullability<T extends ts.PropertyDeclaration | ts.MethodDeclaration>(
  node: T,
): T {
  return isNullable(node)
    ? {
        ...node,
        questionToken: ts.factory.createToken(ts.SyntaxKind.QuestionToken),
      }
    : {
        ...node,
        exclamationToken: ts.factory.createToken(ts.SyntaxKind.ExclamationToken),
      }
}
