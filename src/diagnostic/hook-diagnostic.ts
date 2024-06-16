import * as gql from 'graphql'
import { toClassName } from 'name-util'
import ts from 'typescript'
import { GQLAssistConfig } from '../config'
import {
  GraphQLContext,
  createGraphQLContext,
  getFieldDefinitionFromParent,
  getFieldType,
  getGQLNodeLocationRange,
  getTypeDefinition,
} from '../gql'
import { getGQLContent, getGraphQLQueryVariable } from '../ts'
import { getTSNodeLocationRange } from '../ts/get-ts-node-location-range'
import { Diagnostic, DiagnosticSeverity } from './diagnostic-type'
import { basename } from 'path'

function getAvailableFieldNames(node: gql.ObjectTypeDefinitionNode) {
  return node.fields?.map(field => field.name.value) ?? []
}

function getAvailableFieldNamesString(node: gql.ObjectTypeDefinitionNode) {
  const fieldNames = getAvailableFieldNames(node).map(name => `'${name}'`)
  return [fieldNames.slice(0, -1).join(', '), fieldNames.slice(-1)[0]].join(' and ')
}

function validateSelectionSet(node: gql.SelectionSetNode, context: GraphQLContext) {
  const { parent } = context
  if (!parent) return
  for (const selection of node.selections) {
    if (selection.kind === gql.Kind.FIELD) {
      const fieldName = selection.name.value
      const field = getFieldDefinitionFromParent(parent, fieldName)

      if (!field) {
        const range = getGQLNodeLocationRange(selection, context.offset)
        context.diagnostics.push({
          fileName: context.sourceFile.fileName,
          range,
          severity: DiagnosticSeverity.Error,
          message: `Location: '${context.path.join('.')}' - Property '${fieldName}' does not exist on type 'type ${parent.name.value}'. Available fields are ${getAvailableFieldNamesString(parent)}`,
          code: [context.sourceFile.fileName, range.start.line + 1, range.start.character + 1].join(
            ':',
          ),
        })
      } else if (selection.selectionSet) {
        const nextParent = getFieldType(context.schema, field)
        validateSelectionSet(
          selection.selectionSet,
          createGraphQLContext(context, fieldName, nextParent),
        )
      }
    } else {
      console.warn('Did not process', selection.kind)
    }
  }
}

export function diagnoseReactHook(
  sourceFile: ts.SourceFile,
  schema: gql.DocumentNode,
  config: GQLAssistConfig,
): Diagnostic[] {
  // Find a variable that defines the schema
  const variable = getGraphQLQueryVariable(sourceFile)
  if (!variable) return []

  // Identify graphQL query
  const graphQLQueryString = getGQLContent(variable)
  if (!graphQLQueryString || graphQLQueryString?.trim() === '') return []

  const variableRange = getTSNodeLocationRange(variable, sourceFile)
  const context = createGraphQLContext(
    {
      sourceFile,
      schema,
      config,
      offset: { ...variableRange.start, character: 0 } as any,
    },
    undefined,
  )

  try {
    const document = gql.parse(graphQLQueryString)
    for (const def of document.definitions) {
      if (def.kind === gql.Kind.OPERATION_DEFINITION) {
        const parent = getTypeDefinition(context.schema, toClassName(def.operation))
        validateSelectionSet(
          def.selectionSet,
          createGraphQLContext(context, def.name?.value ?? def.operation, parent),
        )
      }
    }
  } catch (e) {
    // Report syntax error
    context.diagnostics.push({
      fileName: sourceFile.fileName,
      range: getTSNodeLocationRange(variable, sourceFile),
      severity: DiagnosticSeverity.Error,
      message: e.message,
      code: variable.getFullText(),
    })
  }
  return context.diagnostics
}
