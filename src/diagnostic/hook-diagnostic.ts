import * as gql from 'graphql'
import { toClassName } from 'name-util'
import plural from 'pluralize'
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

function getAvailableFieldNames(node: gql.ObjectTypeDefinitionNode) {
  return node.fields?.map(field => field.name.value) ?? []
}

function toQuotedItemsWithAnd(items: string[]) {
  const preprocessed = items.map(name => `'${name}'`)
  if (preprocessed.length === 0) return ''
  if (preprocessed.length === 1) return preprocessed[0]
  return [preprocessed.slice(0, -1).join(', ').trim(), preprocessed.slice(-1)[0].trim()].join(
    ' and ',
  )
}

function getAvailableFieldNamesString(node: gql.ObjectTypeDefinitionNode) {
  const fieldNames = getAvailableFieldNames(node)
  return toQuotedItemsWithAnd(fieldNames)
}

function checkForInvalidField(
  field: gql.FieldDefinitionNode | undefined,
  selection: gql.FieldNode,
  context: GraphQLContext,
) {
  if (field) return
  const { parent } = context
  if (!parent) return
  const fieldName = selection.name.value
  const range = getGQLNodeLocationRange(selection, context.offset)
  context.diagnostics.push({
    fileName: context.sourceFile.fileName,
    range,
    severity: DiagnosticSeverity.Error,
    message: `'${context.path.join('.')}' - Property '${fieldName}' does not exist on type 'type ${parent.name.value}'. Available fields are ${getAvailableFieldNamesString(parent)}.`,
    code: [context.sourceFile.fileName, range.start.line + 1, range.start.character + 1].join(':'),
  })
}

function checkForMissingArguments(
  field: gql.FieldDefinitionNode | undefined,
  selection: gql.FieldNode,
  context: GraphQLContext,
) {
  if (!field) return
  const { parent } = context
  if (!parent) return
  const fieldName = selection.name.value
  const existingArguments = selection.arguments?.map(arg => arg.name.value) ?? []
  const requiredArguments =
    field.arguments?.filter(arg => arg.type.kind === gql.Kind.NON_NULL_TYPE) ?? []
  const missingArguments = requiredArguments.filter(
    argument => !existingArguments.includes(argument.name.value),
  )
  const missingArgumentNames = missingArguments.map(arg => arg.name.value)

  if (missingArguments.length === 0) return
  const range = getGQLNodeLocationRange(parent, context.offset)
  context.diagnostics.push({
    fileName: context.sourceFile.fileName,
    range,
    severity: DiagnosticSeverity.Error,
    message: `'${context.path.join('.')}.${fieldName}' - Missing required ${plural('argument', missingArguments.length)} ${toQuotedItemsWithAnd(missingArgumentNames)}.`,
    code: [context.sourceFile.fileName, range.start.line + 1, range.start.character + 1].join(':'),
  })
}

function checkForInvalidArguments(
  field: gql.FieldDefinitionNode | undefined,
  selection: gql.FieldNode,
  context: GraphQLContext,
) {
  if (!field) return
  const { parent } = context
  if (!parent) return
  const fieldName = selection.name.value
  const allArgumentNames = field.arguments?.map(arg => arg.name.value) ?? []
  const invalidArguments =
    selection.arguments?.filter(argument => !allArgumentNames.includes(argument.name.value)) ?? []
  if (invalidArguments.length === 0) return
  for (const argument of invalidArguments) {
    const range = getGQLNodeLocationRange(argument, context.offset)
    context.diagnostics.push({
      fileName: context.sourceFile.fileName,
      range,
      severity: DiagnosticSeverity.Error,
      message: `'${context.path.join('.')}.${fieldName}' - Invalid argument '${argument.name.value}'. Valid ${plural('argument', allArgumentNames.length)} ${plural('are', allArgumentNames.length)} ${toQuotedItemsWithAnd(allArgumentNames)}.`,
      code: [context.sourceFile.fileName, range.start.line + 1, range.start.character + 1].join(
        ':',
      ),
    })
  }
}

function validateSelectionSet(node: gql.SelectionSetNode, context: GraphQLContext) {
  const { parent } = context
  if (!parent) return
  for (const selection of node.selections) {
    if (selection.kind === gql.Kind.FIELD) {
      const fieldName = selection.name.value
      const field = getFieldDefinitionFromParent(parent, fieldName)
      checkForInvalidField(field, selection, context)
      checkForMissingArguments(field, selection, context)
      checkForInvalidArguments(field, selection, context)
      if (field && selection.selectionSet) {
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
