import { toCamelCase } from 'name-util'
import { toNonNullArray } from 'tsds-tools'
import ts, { factory, isClassDeclaration } from 'typescript'
import { Context, createContext } from '../context'
import {
  addDecorator,
  addExport,
  addImports,
  convertToMethod,
  createArgsDecorator,
  createContextDecorator,
  createFieldDecorator,
  createImport,
  createParentDecorator,
  createReferenceType,
  createResolverDecorator,
  createStringType,
  getAllParameters,
  getName,
  getParameterType,
  getTypeFromDecorator,
  hasDecorator,
  hasImplementationByName,
  hasParameter,
  conditional,
  organizeImports,
  removeNullability,
  transformName,
  withDefaultType,
} from '../gql-util'

function processParameters(
  node: ts.MethodDeclaration,
  parentType: string,
  context: Context,
): ts.MethodDeclaration {
  return {
    ...node,
    parameters: toNonNullArray(
      node.parameters.map(parameter => {
        const name = getName(parameter)
        if (name === 'parent') {
          return addDecorator(
            withDefaultType(parameter, createReferenceType(parentType)),
            createParentDecorator(context),
          )
        } else if (name === 'context') {
          context.imports.push(createImport('@nestjs/graphql', 'Context'))
          return addDecorator(
            withDefaultType(parameter, createReferenceType('GQLContext')),
            createContextDecorator(),
          )
        }
        return addDecorator(
          withDefaultType(parameter, createStringType()),
          createArgsDecorator(parameter, context),
        )
      }),
    ) as any,
  }
}

function addImplementsFieldResolver<T extends ts.ClassDeclaration>(
  node: T,
  fromType: string,
  toType: string,
): T {
  return {
    ...node,
    heritageClauses: [
      factory.createHeritageClause(ts.SyntaxKind.ImplementsKeyword, [
        factory.createExpressionWithTypeArguments(factory.createIdentifier('FieldResolver'), [
          factory.createTypeReferenceNode(factory.createIdentifier(fromType), undefined),
          factory.createTypeReferenceNode(factory.createIdentifier(toType), undefined),
        ]),
      ]),
    ],
  }
}

function getTypesFromFieldResolverImplementation(node: ts.ClassDeclaration) {
  const heritageClause = node.heritageClauses?.find(
    clause =>
      !!clause.types.find(
        type =>
          ts.isExpressionWithTypeArguments(type) &&
          ts.isIdentifier(type.expression) &&
          type.expression.text === 'FieldResolver',
      ),
  )
  const [modelType, originType] =
    heritageClause?.types.find(
      type =>
        ts.isExpressionWithTypeArguments(type) &&
        ts.isIdentifier(type.expression) &&
        type.expression.text === 'FieldResolver',
    )?.typeArguments ?? []
  return {
    modelType:
      modelType && ts.isTypeReferenceNode(modelType) && ts.isIdentifier(modelType.typeName)
        ? modelType.typeName.text
        : undefined,
    parentType:
      originType && ts.isTypeReferenceNode(originType) && ts.isIdentifier(originType.typeName)
        ? originType.typeName.text
        : undefined,
  }
}

function getTypes(node: ts.ClassDeclaration) {
  const { modelType, parentType } = getTypesFromFieldResolverImplementation(node)
  const name = getName(node)
    ?.trim()
    ?.replace(/Resolver$/, '')
  return [
    modelType ?? getTypeFromDecorator(node, 'Resolver') ?? name,
    parentType ?? getTypeNameFromParameters(node),
  ]
}

function getTypeNameFromParameters(node: ts.ClassDeclaration) {
  return toNonNullArray(
    getAllParameters(node).map(parameter =>
      getName(parameter) === 'parent' ? getParameterType(parameter) : undefined,
    ),
  )[0]
}

function getFieldDecoratorType(node: ts.Node) {
  if (
    hasDecorator(node, 'ResolveField') ||
    ((ts.isFunctionTypeNode(node)
      ? hasParameter(node.type, 'parent')
      : hasParameter(node, 'parent')) &&
      !hasDecorator(node, 'Query') &&
      !hasDecorator(node, 'Mutation'))
  ) {
    return 'ResolveField'
  }
  if (hasDecorator(node, 'Mutation')) return 'Mutation'
  return 'Query'
}

function processClassDeclaration(classDeclaration: ts.ClassDeclaration, context: Context) {
  const [modelType, parentType] = getTypes(classDeclaration)
  const typeFromDecorator = getTypeFromDecorator(classDeclaration, 'Resolver')
  const hasFieldResolver = hasImplementationByName(classDeclaration, 'FieldResolver')
  return ts.visitEachChild(
    addExport(
      addDecorator(
        conditional(
          (hasFieldResolver || !!typeFromDecorator) && !!parentType,
          () => addImplementsFieldResolver(classDeclaration, modelType, parentType),
          classDeclaration,
        ),
        createResolverDecorator(modelType, hasFieldResolver || !!typeFromDecorator, context),
      ),
    ),
    node => {
      const fieldDecoratorType = getFieldDecoratorType(node)
      if (
        ts.isPropertyDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.type &&
        ts.isFunctionTypeNode(node.type)
      ) {
        const method = addDecorator(
          convertToMethod(removeNullability(transformName(node, toCamelCase))),
          createFieldDecorator(node, fieldDecoratorType, context),
        )
        if (ts.isMethodDeclaration(method)) return processParameters(method, parentType, context)
        return method
      } else if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name)) {
        const method = addDecorator(
          removeNullability(transformName(node, toCamelCase)),
          createFieldDecorator(node, fieldDecoratorType, context),
        )
        if (ts.isMethodDeclaration(method)) return processParameters(method, parentType, context)
        return method
      }
      return node
    },
    undefined,
  )
}

export function isResolver(sourceFile: ts.SourceFile) {
  const { fileName } = sourceFile
  return (
    fileName.endsWith('.resolver.ts') ||
    sourceFile.statements.some(statement => hasDecorator(statement, 'Resolver'))
  )
}

export async function generateResolver(sourceFile: ts.SourceFile): Promise<ts.SourceFile> {
  if (!isResolver(sourceFile)) return sourceFile
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
