import { toCamelCase } from 'name-util'
import { toNonNullArray } from 'tsds-tools'
import ts, { factory, isClassDeclaration } from 'typescript'
import { addDecorator } from '../../ts/add-decorator'
import { addExport } from '../../ts/add-export'
import { addImports } from '../../ts/add-imports'
import { conditional } from '../../ts/conditional'
import { convertToMethod } from '../../ts/convert-to-method'
import { createArgsDecorator } from '../../ts/create-args-decorator'
import { createContextDecorator } from '../../ts/create-context-decorator'
import { createImport } from '../../ts/create-import'
import { createParentDecorator } from '../../ts/create-parent-decorator'
import { createPropertyOrMethodDecorator } from '../../ts/create-property-or-method-decorator'
import { createResolverDecorator } from '../../ts/create-resolver-decorator'
import {
  createPromiseType,
  createReferenceType,
  createStringType,
  createType,
} from '../../ts/create-type'
import { getAllTypes } from '../../ts/get-all-types'
import { hasImplementationByName } from '../../ts/get-comment-from-decorator'
import { hasDecorator } from '../../ts/get-decorator'
import { getName } from '../../ts/get-name'
import { getAllParameters, hasParameter } from '../../ts/get-parameter'
import { getParameterType } from '../../ts/get-parameter-by-type'
import { getType, getTypeFromDecorator } from '../../ts/get-type'
import { isAsync } from '../../ts/is-async'
import { organizeImports } from '../../ts/organize-imports'
import { removeNullability } from '../../ts/remove-nullability'
import { transformName } from '../../ts/transform-name'
import { withDefaultType } from '../../ts/with-default-type'
import { Context, createContext } from '../context'

function processParameters(
  node: ts.MethodDeclaration,
  parentType: string,
  context: Context,
): ts.MethodDeclaration {
  return {
    ...node,
    parameters: toNonNullArray(
      node.parameters.map(parameter => {
        if (!!parameter.dotDotDotToken) {
          const type = getType(node)
          return addDecorator(
            factory.createParameterDeclaration(
              undefined,
              undefined,
              factory.createIdentifier('parent'),
              undefined,
              factory.createTypeReferenceNode(
                factory.createIdentifier(parentType ?? type ?? 'unknown'),
                undefined,
              ),
              undefined,
            ),
            createParentDecorator(context),
          )
        }
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

function processReturnType(node: ts.MethodDeclaration, context: Context): ts.MethodDeclaration {
  if (!node.type) return node
  const types: Array<string | string[]> = []
  ts.visitEachChild(
    node.type,
    node => {
      if (ts.isIdentifier(node)) {
        types.push(node.text)
      }
      if (ts.isTypeNode(node)) {
        types.push(getAllTypes(node))
      }
      return node
    },
    undefined,
  )
  const uniqueTypes = toNonNullArray(Array.from(new Set(types.flat())))
  const typesWithoutPromise = uniqueTypes.filter(i => i !== 'Promise')
  const hasPromise = isAsync(node)
  return {
    ...node,
    type: hasPromise
      ? createPromiseType(...typesWithoutPromise)
      : createType(...typesWithoutPromise),
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
    ((hasParameter(ts.isFunctionTypeNode(node) ? node.type : node, 'parent') ||
      hasParameter(ts.isFunctionTypeNode(node) ? node.type : node, 'args')) &&
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
      if (
        ts.isMethodDeclaration(node) ||
        (ts.isPropertyDeclaration(node) && node.type && ts.isFunctionTypeNode(node.type))
      ) {
        const method = convertToMethod(node as any)
        if (method) {
          const fieldDecoratorType = getFieldDecoratorType(method)
          return addDecorator(
            processParameters(
              processReturnType(removeNullability(transformName(method, toCamelCase)), context),
              parentType,
              context,
            ),
            createPropertyOrMethodDecorator(method, fieldDecoratorType, context),
          )
        }
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
