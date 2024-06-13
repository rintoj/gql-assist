import ts, { factory } from 'typescript'
import { addImports } from '../../ts/add-imports'
import { createImport } from '../../ts/create-import'
import { getName } from '../../ts/get-name'
import { organizeImports } from '../../ts/organize-imports'
import { Context, createContext } from '../context'

function createRegisterEnum(node: ts.EnumDeclaration, context: Context) {
  const name = getName(node)
  context.imports.push(createImport('@nestjs/graphql', 'registerEnumType'))
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

export function isEnum(sourceFile: ts.SourceFile) {
  const { fileName } = sourceFile
  return (
    fileName.endsWith('.enum.ts') ||
    fileName.endsWith('.input.ts') ||
    fileName.endsWith('.model.ts') ||
    fileName.endsWith('.resolver.ts') ||
    fileName.endsWith('.response.ts')
  )
}

export async function generateEnum(sourceFile: ts.SourceFile): Promise<ts.SourceFile> {
  if (!isEnum(sourceFile)) return sourceFile
  const context = createContext()
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
