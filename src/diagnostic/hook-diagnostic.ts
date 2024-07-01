import * as gql from 'graphql'
import ts from 'typescript'
import { GQLAssistConfig } from '../config'
import { Position, Range } from '../diff'
import { GraphQLContext, createGraphQLContext, getGQLNodeLocationRange } from '../gql'
import { getGQLContent, getGraphQLQueryVariable, getTSNodeLocationRange } from '../ts'
import { Diagnostic, DiagnosticSeverity } from './diagnostic-type'
import { NoDuplicateFieldName } from './rules/NoDuplicateFieldName'

const additionalRules = [NoDuplicateFieldName]

function toDiagnostic(
  error: gql.GraphQLError,
  context: Pick<GraphQLContext, 'offset' | 'sourceFile'>,
): Diagnostic[] {
  const lineOffset = context?.offset?.line ?? 0
  if (!error.nodes?.length) {
    const { line, column } = error.locations?.[0] ?? { line: 1, column: 1 }
    const position = new Position(line, column)
    let range = new Range(
      new Position(position.line + lineOffset - 1, position.character - 1),
      new Position(position.line + lineOffset - 1, position.character),
    )
    return [
      {
        fileName: context.sourceFile.fileName,
        range,
        severity: DiagnosticSeverity.Error,
        message: error.message,
        code: [context.sourceFile.fileName, range.start.line + 1, range.start.character + 1].join(
          ':',
        ),
      },
    ]
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

export function diagnoseGraphQLQuery(
  query: string,
  schema: gql.GraphQLSchema,
  context: Pick<GraphQLContext, 'offset' | 'sourceFile'>,
): Diagnostic[] {
  try {
    const document = gql.parse(query)
    const result = gql
      .validate(schema, document)
      .concat(additionalRules.flatMap(rule => rule(document, schema)))
    return result.flatMap(error => toDiagnostic(error, context))
  } catch (e) {
    return toDiagnostic(e, context).flat()
  }
}

export function diagnoseSchema(
  sourceFile: ts.SourceFile,
  schema: gql.GraphQLSchema | undefined,
): Diagnostic[] {
  if (schema) return []
  const variable = getGraphQLQueryVariable(sourceFile)
  if (!variable) return []
  const graphQLQueryString = getGQLContent(variable)
  if (!graphQLQueryString || graphQLQueryString?.trim() === '') return []
  const range = getTSNodeLocationRange(variable, sourceFile)
  return [
    {
      fileName: sourceFile.fileName,
      range,
      severity: DiagnosticSeverity.Error,
      message: `No schema. Run command "gql-assist.choose.schema" to configure schema`,
      code: [sourceFile.fileName, range.start.line + 1, range.start.character + 1].join(':'),
    },
  ]
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
  return diagnoseGraphQLQuery(graphQLQueryString, schema, context)
}
