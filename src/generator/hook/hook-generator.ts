import * as gql from 'graphql'
import { GraphQLSchema } from 'graphql'
import ts from 'typescript'
import { GQLAssistConfig } from '../../config'
import { diagnoseReactHook } from '../../diagnostic'
import {
  createDefaultImport,
  createGraphQLQuery,
  createImport,
  getGQLContent,
  getGraphQLQueryVariable,
} from '../../ts'
import { addImports } from '../../ts/add-imports'
import { organizeImports } from '../../ts/organize-imports'
import { Context, createContext } from '../context'
import { createGraphQLHook, generateTypes } from './graphql-type-generator'
import { GraphQLTypeParser } from './graphql-type-parser'

export function isHook(sourceFile: ts.SourceFile, config: GQLAssistConfig) {
  const { fileName } = sourceFile
  if (!config.reactHook.enable) return false
  return !!config?.reactHook?.fileExtensions?.find(i => fileName.endsWith(i))
}

async function generateGQLHook(sourceFile: ts.SourceFile, schema: GraphQLSchema, context: Context) {
  const variable = getGraphQLQueryVariable(sourceFile)
  if (!variable) return sourceFile
  const graphQLQueryString = getGQLContent(variable)
  if (!graphQLQueryString || graphQLQueryString?.trim() === '') return sourceFile
  const document = gql.parse(graphQLQueryString.replace(/\{[\s\n]*\}/g, '{ __typename }'))
  const parser = GraphQLTypeParser.parse(schema, document)
  context.imports.push(createImport('@apollo/client', 'QueryHookOptions', 'useQuery'))
  context.imports.push(createDefaultImport('graphql-tag', 'gql'))
  const graphqlQuery = gql.print(parser.getDocument())
  const statements = [
    createGraphQLQuery(`\n${graphqlQuery}\n`),
    ...generateTypes(parser.getTypeMap()),
    createGraphQLHook(parser.getDocument(), variable),
  ] as any
  return {
    ...sourceFile,
    statements,
  } as ts.SourceFile
}

export async function generateHook(
  sourceFile: ts.SourceFile,
  schema: GraphQLSchema,
  config: GQLAssistConfig,
): Promise<ts.SourceFile> {
  if (!isHook(sourceFile, config)) return sourceFile
  const context = createContext({ config })
  const errors = diagnoseReactHook(sourceFile, schema, config)
  console.log(errors)
  const updatedSourcefile = await generateGQLHook(sourceFile, schema, context)
  return organizeImports(addImports(updatedSourcefile, context.imports))
}
