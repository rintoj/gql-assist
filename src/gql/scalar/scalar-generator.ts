import ts, { factory, isClassDeclaration } from 'typescript'
import { Context, createContext } from '../context'
import {
  addImports,
  createImport,
  getComment,
  getMethodDeclaration,
  getName,
  getPropertyDeclaration,
  hasDecorator,
  organizeImports,
} from '../gql-util'

function createScalarDescription(node: ts.ClassDeclaration) {
  const comment = getComment(node) ?? getName(node)
  return (
    getPropertyDeclaration(node, 'description') ??
    factory.createPropertyDeclaration(
      undefined,
      factory.createIdentifier('description'),
      undefined,
      undefined,
      factory.createStringLiteral(comment),
    )
  )
}

function createParseValueFunction(node: ts.ClassDeclaration) {
  return (
    getMethodDeclaration(node, 'parseValue') ??
    factory.createMethodDeclaration(
      undefined,
      undefined,
      factory.createIdentifier('parseValue'),
      undefined,
      undefined,
      [
        factory.createParameterDeclaration(
          undefined,
          undefined,
          factory.createIdentifier('value'),
          undefined,
          factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
          undefined,
        ),
      ],
      factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
      factory.createBlock([factory.createReturnStatement(factory.createIdentifier('value'))], true),
    )
  )
}

function createSerializeFunction(node: ts.ClassDeclaration) {
  return (
    getMethodDeclaration(node, 'serialize') ??
    factory.createMethodDeclaration(
      undefined,
      undefined,
      factory.createIdentifier('serialize'),
      undefined,
      undefined,
      [
        factory.createParameterDeclaration(
          undefined,
          undefined,
          factory.createIdentifier('value'),
          undefined,
          factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
          undefined,
        ),
      ],
      factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
      factory.createBlock([factory.createReturnStatement(factory.createIdentifier('value'))], true),
    )
  )
}

function createParseLiteralFunction(node: ts.ClassDeclaration) {
  return (
    getMethodDeclaration(node, 'parseLiteral') ??
    factory.createMethodDeclaration(
      undefined,
      undefined,
      factory.createIdentifier('parseLiteral'),
      undefined,
      undefined,
      [
        factory.createParameterDeclaration(
          undefined,
          undefined,
          factory.createIdentifier('ast'),
          undefined,
          factory.createTypeReferenceNode(factory.createIdentifier('ValueNode'), undefined),
          undefined,
        ),
      ],
      factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
      factory.createBlock(
        [
          factory.createIfStatement(
            factory.createBinaryExpression(
              factory.createPropertyAccessExpression(
                factory.createIdentifier('ast'),
                factory.createIdentifier('kind'),
              ),
              factory.createToken(ts.SyntaxKind.EqualsEqualsEqualsToken),
              factory.createPropertyAccessExpression(
                factory.createIdentifier('Kind'),
                factory.createIdentifier('STRING'),
              ),
            ),
            factory.createBlock(
              [
                factory.createReturnStatement(
                  factory.createPropertyAccessExpression(
                    factory.createIdentifier('ast'),
                    factory.createIdentifier('value'),
                  ),
                ),
              ],
              true,
            ),
            undefined,
          ),
          factory.createReturnStatement(factory.createNull()),
        ],
        true,
      ),
    )
  )
}

function createImplementsCustomScalar() {
  return factory.createHeritageClause(ts.SyntaxKind.ImplementsKeyword, [
    factory.createExpressionWithTypeArguments(factory.createIdentifier('CustomScalar'), [
      factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
      factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
    ]),
  ])
}

function processClassDeclaration(node: ts.ClassDeclaration, context: Context) {
  const name = node.name && ts.isIdentifier(node.name) ? node.name.text : ''
  context.imports.push(createImport('@nestjs/graphql', 'CustomScalar', 'Scalar'))
  context.imports.push(createImport('graphql', 'Kind', 'ValueNode'))
  return factory.createClassDeclaration(
    [
      factory.createDecorator(
        factory.createCallExpression(factory.createIdentifier('Scalar'), undefined, [
          factory.createStringLiteral(name),
        ]),
      ),
      factory.createToken(ts.SyntaxKind.ExportKeyword),
    ],
    factory.createIdentifier(name),
    undefined,
    [createImplementsCustomScalar()],
    [
      createScalarDescription(node),
      createParseValueFunction(node),
      createSerializeFunction(node),
      createParseLiteralFunction(node),
    ],
  )
}

export function isScalar(sourceFile: ts.SourceFile) {
  const { fileName } = sourceFile
  return (
    fileName.endsWith('.scalar.ts') ||
    sourceFile.statements.some(statement => hasDecorator(statement, 'Scalar'))
  )
}

export async function generateScalar(sourceFile: ts.SourceFile): Promise<ts.SourceFile> {
  if (!isScalar(sourceFile)) return sourceFile
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
