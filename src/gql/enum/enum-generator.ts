import ts, { factory } from 'typescript'
import { Context, createContext } from '../context'
import { addImports, createImport, getName, organizeImports } from '../gql-util'

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
  return fileName.endsWith('.enum.ts')
}

export async function generateEnum(sourceFile: ts.SourceFile): Promise<ts.SourceFile> {
  if (!isEnum(sourceFile)) return sourceFile
  const context = createContext()
  const updatedSourcefile = ts.visitEachChild(
    sourceFile,
    node => {
      if (ts.isEnumDeclaration(node)) return processEnumDeclaration(node, context)
      return node
    },
    undefined,
  )
  return organizeImports(addImports(updatedSourcefile, context.imports))
}
