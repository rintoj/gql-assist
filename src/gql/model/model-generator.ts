import { toCamelCase } from 'name-util'
import ts, { isClassDeclaration } from 'typescript'
import { Context, createContext } from '../context'
import {
  addDecorator,
  addImports,
  addNullability,
  createFieldDecorator,
  createObjectTypeDecorator,
  hasDecorator,
  organizeImports,
  transformName,
} from '../gql-util'

function processClassDeclaration(classDeclaration: ts.ClassDeclaration, context: Context) {
  return ts.visitEachChild(
    addDecorator(classDeclaration, createObjectTypeDecorator(classDeclaration, context)),
    node => {
      if (ts.isPropertyDeclaration(node) && ts.isIdentifier(node.name)) {
        return addDecorator(
          addNullability(transformName(node, toCamelCase)),
          createFieldDecorator(node, 'Field', context),
        )
      }
      return node
    },
    undefined,
  )
}

export function isModel(sourceFile: ts.SourceFile) {
  const { fileName } = sourceFile
  return (
    fileName.endsWith('.model.ts') ||
    sourceFile.statements.some(statement => hasDecorator(statement, 'ObjectType'))
  )
}

export async function generateModel(sourceFile: ts.SourceFile): Promise<ts.SourceFile> {
  if (!isModel(sourceFile)) return sourceFile
  const context = createContext()
  const updatedSourcefile = ts.visitEachChild(
    sourceFile,
    node => {
      if (isClassDeclaration(node)) return processClassDeclaration(node, context)
      return node
    },
    undefined,
  )
  return organizeImports(addImports(updatedSourcefile, context.imports))
}
