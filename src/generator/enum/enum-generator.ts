import ts, { factory } from 'typescript'
import { addImports } from '../../ts/add-imports'
import { createImport } from '../../ts/create-import'
import { getName } from '../../ts/get-name'
import { organizeImports } from '../../ts/organize-imports'
import { Context, createContext } from '../context'
import { GQLAssistConfig } from '../../config'

function createRegisterEnum(node: ts.EnumDeclaration, context: Context) {
  const name = getName(node)
  context.imports.push(createImport(context.config.behaviour.serverLibrary, 'registerEnumType'))
  return factory.createExpressionStatement(
    factory.createCallExpression(factory.createIdentifier('registerEnumType'), undefined, [
      factory.createIdentifier(name),
      factory.createObjectLiteralExpression(
        [
          factory.createPropertyAssignment(
            factory.createIdentifier('name'),
            factory.createStringLiteral(name),
          ),
        ],
        false,
      ),
    ]),
  )
}

function processEnumDeclaration(node: ts.EnumDeclaration, context: Context) {
  return [
    ts.visitEachChild(
      node,
      node => {
        if (ts.isEnumMember(node)) {
          const name = getName(node)
          return { ...node, initializer: factory.createStringLiteral(name) }
        }
        return node
      },
      undefined,
    ),
    createRegisterEnum(node, context),
  ]
}

export function isEnum(sourceFile: ts.SourceFile, config: GQLAssistConfig) {
  const { fileName } = sourceFile
  if (!config.enum.enable) return false
  return !!config?.enum?.fileExtensions?.find(i => fileName.endsWith(i))
}

export async function generateEnum(
  sourceFile: ts.SourceFile,
  config: GQLAssistConfig,
): Promise<ts.SourceFile> {
  if (!isEnum(sourceFile, config)) return sourceFile
  const context = createContext({ config })
  const updatedSourcefile = ts.visitEachChild(
    sourceFile,
    node => {
      if (ts.isEnumDeclaration(node)) return processEnumDeclaration(node, context)
      if (
        ts.isExpressionStatement(node) &&
        ts.isCallExpression(node.expression) &&
        ts.isIdentifier(node.expression.expression) &&
        node.expression.expression.text === 'registerEnumType'
      ) {
        return
      }
      return node
    },
    undefined,
  )
  return organizeImports(addImports(updatedSourcefile, context.imports))
}
