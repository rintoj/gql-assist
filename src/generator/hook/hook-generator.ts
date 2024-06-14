import { DocumentNode } from 'graphql'
import ts from 'typescript'
import { createContext } from '../context'
import { generateGQLHook } from './generate-gql-hook'
import { identifyLibrary } from './identify-graphql-library'
import { addImports } from '../../ts/add-imports'
import { organizeImports } from '../../ts/organize-imports'

export interface GenerateHookOptions {
  gqlLibrary?: string
}

export function isHook(sourceFile: ts.SourceFile) {
  const { fileName } = sourceFile
  return fileName.endsWith('.gql.ts')
}

export async function generateHook(
  sourceFile: ts.SourceFile,
  schema: DocumentNode,
  options?: GenerateHookOptions,
): Promise<ts.SourceFile> {
  if (!isHook(sourceFile)) return sourceFile
  const context = createContext({
    gqlLibrary: options?.gqlLibrary ?? identifyLibrary(sourceFile),
  })
  const updatedSourcefile = await generateGQLHook(schema, sourceFile, context)
  return organizeImports(addImports(updatedSourcefile, context.imports))
}
