import { DocumentNode } from 'graphql'
import ts from 'typescript'
import { createContext } from '../context'
import { generateGQLHook } from './generate-gql-hook'
import { identifyLibrary } from './identify-graphql-library'
import { addImports } from '../../ts/add-imports'
import { organizeImports } from '../../ts/organize-imports'
import { GQLAssistConfig } from '../../config'

export function isHook(sourceFile: ts.SourceFile, config: GQLAssistConfig) {
  const { fileName } = sourceFile
  if (!config.reactHook.enable) return false
  return !!config?.reactHook?.fileExtensions?.find(i => fileName.endsWith(i))
}

export async function generateHook(
  sourceFile: ts.SourceFile,
  schema: DocumentNode,
  config: GQLAssistConfig,
): Promise<ts.SourceFile> {
  if (!isHook(sourceFile, config)) return sourceFile
  const context = createContext({ config })
  const updatedSourcefile = await generateGQLHook(schema, sourceFile, context)
  return organizeImports(addImports(updatedSourcefile, context.imports))
}
