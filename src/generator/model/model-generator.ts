import { toCamelCase } from 'name-util'
import ts, { isClassDeclaration } from 'typescript'
import { addDecorator } from '../../ts/add-decorator'
import { addImports } from '../../ts/add-imports'
import { addNullability } from '../../ts/add-nullability'
import { createClassDecorator } from '../../ts/create-class-decorator'
import { createPropertyOrMethodDecorator } from '../../ts/create-property-or-method-decorator'
import { hasDecorator } from '../../ts/get-decorator'
import { organizeImports } from '../../ts/organize-imports'
import { transformName } from '../../ts/transform-name'
import { Context, createContext } from '../context'
import { GQLAssistConfig } from '../../config'

function processClassDeclaration(classDeclaration: ts.ClassDeclaration, context: Context) {
  return ts.visitEachChild(
    addDecorator(classDeclaration, createClassDecorator(classDeclaration, 'ObjectType', context)),
    node => {
      if (ts.isPropertyDeclaration(node) && ts.isIdentifier(node.name)) {
        return addDecorator(
          addNullability(
            transformName(node, toCamelCase),
            context.config.behaviour.nullableByDefault,
          ),
          createPropertyOrMethodDecorator(node, 'Field', context),
        )
      }
      return node
    },
    undefined,
  )
}

export function isModel(sourceFile: ts.SourceFile, config: GQLAssistConfig): boolean {
  const { fileName } = sourceFile
  if (!config.model.enable) return false
  return (
    !!config?.model?.fileExtensions?.find(i => fileName.endsWith(i)) ||
    sourceFile.statements.some(statement => hasDecorator(statement, 'ObjectType'))
  )
}

export function isResponse(sourceFile: ts.SourceFile, config: GQLAssistConfig): boolean {
  const { fileName } = sourceFile
  if (!config.response.enable) return false
  return !!config?.response?.fileExtensions?.find(i => fileName.endsWith(i))
}

export async function generateModel(
  sourceFile: ts.SourceFile,
  config: GQLAssistConfig,
): Promise<ts.SourceFile> {
  if (!isModel(sourceFile, config) && !isResponse(sourceFile, config)) return sourceFile
  const context = createContext({ config })
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
