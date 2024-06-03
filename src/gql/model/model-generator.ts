import ts, { isClassDeclaration } from 'typescript'
import { Context, createContext } from '../context'
import {
  addDecorator,
  addImports,
  createFieldDecorator,
  createObjectTypeDecorator,
  hasDecorator,
  organizeImports,
} from '../gql-util'

function processClassDeclaration(classDeclaration: ts.ClassDeclaration, context: Context) {
  return ts.visitEachChild(
    addDecorator(classDeclaration, createObjectTypeDecorator(context)),
    (node) => {
      if (ts.isPropertyDeclaration(node)) {
        return addDecorator(node, createFieldDecorator(node, context))
      }
      return node
    },
    undefined
  )
}

export async function generateModel(sourceFile: ts.SourceFile): Promise<ts.SourceFile> {
  const { fileName } = sourceFile

  // validate
  const isModel =
    fileName.endsWith('.model.ts') ||
    sourceFile.statements.some((statement) => hasDecorator(statement, 'ObjectType'))
  if (!isModel) return sourceFile

  const context = createContext()

  const updatedSourcefile = ts.visitEachChild(
    sourceFile,
    (node) => {
      if (isClassDeclaration(node)) return processClassDeclaration(node, context)
      return node
    },
    undefined
  )

  return organizeImports(addImports(updatedSourcefile, context.imports))
}
