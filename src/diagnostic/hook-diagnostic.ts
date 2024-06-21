import * as gql from 'graphql'
import ts from 'typescript'
import { GQLAssistConfig } from '../config'
import { Position, Range } from '../diff'
import {
  GraphQLContext,
  createGraphQLContext,
  fixGraphQLString,
  getGQLNodeLocationRange,
} from '../gql'
import { getGQLContent, getGraphQLQueryVariable, getTSNodeLocationRange } from '../ts'
import { Diagnostic, DiagnosticSeverity } from './diagnostic-type'

function toError(error: gql.GraphQLError, context: GraphQLContext) {
  const lineOffset = context?.offset?.line ?? 0
  if (!error.nodes?.length) {
    const { line, column } = error.locations?.[0] ?? { line: 1, column: 1 }
    const position = new Position(line, column)
    let range = new Range(
      new Position(position.line + lineOffset - 1, position.character - 1),
      new Position(position.line + lineOffset - 1, position.character),
    )
    return {
      fileName: context.sourceFile.fileName,
      range,
      severity: DiagnosticSeverity.Error,
      message: error.message,
      code: [context.sourceFile.fileName, range.start.line + 1, range.start.character + 1].join(
        ':',
      ),
    }
  }
  return error.nodes.map(node => {
    const range = getGQLNodeLocationRange(node, context.offset)
    return {
      fileName: context.sourceFile.fileName,
      range,
      severity: DiagnosticSeverity.Error,
      message: error.message,
      code: [context.sourceFile.fileName, range.start.line + 1, range.start.character + 1].join(
        ':',
      ),
    }
  })
}

export function diagnoseReactHook(
  sourceFile: ts.SourceFile,
  schema: gql.GraphQLSchema,
  config: GQLAssistConfig,
): Diagnostic[] {
  const variable = getGraphQLQueryVariable(sourceFile)
  if (!variable) return []
  const graphQLQueryString = getGQLContent(variable)
  if (!graphQLQueryString || graphQLQueryString?.trim() === '') return []
  const variableRange = getTSNodeLocationRange(variable, sourceFile)
  const offset = new Position(variableRange.start.line, 0)
  const context = createGraphQLContext({ sourceFile, schema, config, offset }, undefined)
  try {
    const document = gql.parse(graphQLQueryString)
    const result = gql.validate(schema, document)
    return result.flatMap(error => toError(error, context))
  } catch (e) {
    return [toError(e, context)].flat()
  }
}
