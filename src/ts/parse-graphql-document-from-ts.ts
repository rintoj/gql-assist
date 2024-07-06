import * as gql from 'graphql'
import ts from 'typescript'
import { makeQueryParsable } from '../gql/make-query-parsable'
import { isPositionWithInRange, Position } from '../position'
import { getGQLContent } from './get-gql-query-content'
import { getGraphQLQueryVariable } from './get-gql-query-variable'
import { getTSNodeLocationRange } from './get-ts-node-location-range'

export interface ParseOptions {
  position?: Position | undefined
  parse?: boolean
  fix?: boolean
}

export interface GraphQLContext {
  sourceFile: ts.SourceFile
  variable?: ts.VariableDeclaration
  source?: string
  offset?: Position
  document?: gql.DocumentNode
}

export function parseGraphQLDocumentFromTS(
  sourceFile: ts.SourceFile,
  options?: ParseOptions,
): GraphQLContext {
  const variable = getGraphQLQueryVariable(sourceFile)
  if (!variable) return { sourceFile }

  const range = getTSNodeLocationRange(variable, sourceFile)
  if (options?.position && !isPositionWithInRange(options?.position, range)) {
    return { sourceFile }
  }
  const offset = new Position(range.start.line, 0)

  const source = getGQLContent(variable)
  if (!source) return { sourceFile, variable, offset }
  if (source.trim() === '')
    return {
      sourceFile,
      variable,
      source,
      offset,
    }

  const document =
    options?.parse !== false
      ? gql.parse(options?.fix !== false ? makeQueryParsable(source) : source)
      : undefined

  return {
    sourceFile,
    variable,
    source,
    offset,
    document,
  }
}
