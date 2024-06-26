import * as gql from 'graphql'
import { GraphQLSchema } from 'graphql'
import ts from 'typescript'
import { GQLAssistConfig } from '../../config'
import { Diagnostic, diagnoseGraphQLQuery } from '../../diagnostic'
import {
  createDefaultImport,
  createGraphQLQuery,
  getGQLContent,
  getGraphQLQueryVariable,
} from '../../ts'
import { addImports } from '../../ts/add-imports'
import { organizeImports } from '../../ts/organize-imports'
import { Context, createContext } from '../context'
import { parseDocument } from './graphql-document-parser'
import { createGraphQLHook } from './graphql-type-generator'

const hooks = ['useQuery', 'useMutation', 'useSubscription']

export function isHook(sourceFile: ts.SourceFile, config: GQLAssistConfig) {
  const { fileName } = sourceFile
  if (!config.reactHook.enable) return false
  return !!config?.reactHook?.fileExtensions?.find(i => fileName.endsWith(i))
}

function identifyLibrary(sourceFile: ts.SourceFile, config: GQLAssistConfig) {
  const imports = sourceFile.statements.find((s): s is ts.ImportDeclaration =>
    ts.isImportDeclaration(s) &&
      s.importClause?.namedBindings &&
      ts.isNamedImports(s.importClause?.namedBindings)
      ? !!s.importClause?.namedBindings?.elements.find(e =>
        hooks.includes(e.name.escapedText ?? ''),
      )
      : false,
  )
  return imports?.moduleSpecifier && ts.isStringLiteral(imports?.moduleSpecifier)
    ? imports?.moduleSpecifier.text
    : config.reactHook.library
}

async function generateGQLHook(sourceFile: ts.SourceFile, schema: GraphQLSchema, context: Context) {
  // identify graphql variable
  const variable = getGraphQLQueryVariable(sourceFile)
  if (!variable) return { sourceFile, errors: [] }
  const query = getGQLContent(variable)
  if (!query || query?.trim() === '') return { sourceFile, errors: [] }

  // parse graphql
  const initialDocument = gql.parse(query.replace(/\{[\s\n]*\}/g, '{ __typename }'))
  const { document, types } = parseDocument(initialDocument, schema)

  // create imports
  const libraryName = identifyLibrary(sourceFile, context.config)
  context.imports.push(createDefaultImport('graphql-tag', 'gql'))

  const processedFile = {
    ...sourceFile,
    statements: [
      createGraphQLQuery(document, variable),
      ...types,
      createGraphQLHook(document, variable, libraryName, context),
    ] as any,
  } as ts.SourceFile

  const errors = diagnoseGraphQLQuery(gql.print(document), schema, { ...context, sourceFile })
  const statement = addImports(processedFile, context.imports)
  return { sourceFile: organizeImports(statement), errors }
}

export async function generateHookWithErrors(
  sourceFile: ts.SourceFile,
  schema: GraphQLSchema,
  config: GQLAssistConfig,
): Promise<{ sourceFile: ts.SourceFile; errors: Diagnostic[] }> {
  if (!isHook(sourceFile, config)) return { sourceFile, errors: [] }
  const context = createContext({ config })
  return await generateGQLHook(sourceFile, schema, context)
}

export async function generateHook(
  inputFile: ts.SourceFile,
  schema: GraphQLSchema,
  config: GQLAssistConfig,
): Promise<ts.SourceFile> {
  const { sourceFile } = await generateHookWithErrors(inputFile, schema, config)
  return sourceFile
}
