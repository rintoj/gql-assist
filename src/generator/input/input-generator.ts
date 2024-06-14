import { toCamelCase } from 'name-util'
import ts, { isClassDeclaration } from 'typescript'
import { GQLAssistConfig } from '../../config'
import { addDecorator } from '../../ts/add-decorator'
import { addImports } from '../../ts/add-imports'
import { addNullability } from '../../ts/add-nullability'
import { createClassDecorator } from '../../ts/create-class-decorator'
import { createPropertyOrMethodDecorator } from '../../ts/create-property-or-method-decorator'
import { hasDecorator } from '../../ts/get-decorator'
import { organizeImports } from '../../ts/organize-imports'
import { transformName } from '../../ts/transform-name'
import { Context, createContext } from '../context'

function processClassDeclaration(classDeclaration: ts.ClassDeclaration, context: Context) {
  return ts.visitEachChild(
    addDecorator(classDeclaration, createClassDecorator(classDeclaration, 'InputType', context)),
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

export function isInput(sourceFile: ts.SourceFile, config: GQLAssistConfig) {
  const { fileName } = sourceFile
  if (!config.input.enable) return false
  return (
    !!config?.input?.fileExtensions?.find(i => fileName.endsWith(i)) ||
    sourceFile.statements.some(statement => hasDecorator(statement, 'InputType'))
  )
}

export async function generateInput(
  sourceFile: ts.SourceFile,
  config: GQLAssistConfig,
): Promise<ts.SourceFile> {
  if (!isInput(sourceFile, config)) return sourceFile
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
