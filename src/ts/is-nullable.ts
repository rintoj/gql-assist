import ts from 'typescript'
import { getAllTypes } from './get-all-types'

export function isNullable(
  node: ts.PropertyDeclaration | ts.MethodDeclaration | ts.ParameterDeclaration,
  nullableByDefault: boolean,
): boolean {
  if (ts.isParameter(node)) {
    return !!node.questionToken
  }
  if (ts.isMethodDeclaration(node)) {
    return !!getAllTypes(node.type).find(i => i === 'null' || i === 'undefined')
  }
  return nullableByDefault ? !node.exclamationToken : !!node.questionToken
}
