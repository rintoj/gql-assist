import ts from 'typescript'
import { config } from '../config'
import { getAllTypes } from './get-all-types'

export function isNullable(
  node: ts.PropertyDeclaration | ts.MethodDeclaration | ts.ParameterDeclaration,
): boolean {
  if (ts.isParameter(node)) {
    return !!node.questionToken
  }
  if (ts.isMethodDeclaration(node)) {
    return !!getAllTypes(node.type).find(i => i === 'null' || i === 'undefined')
  }
  return config.nullableByDefault ? !node.exclamationToken : !!node.questionToken
}
