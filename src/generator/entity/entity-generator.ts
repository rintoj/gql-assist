import { toCamelCase } from 'name-util'
import ts, {
  factory,
  isClassDeclaration,
  isEnumDeclaration,
  PropertyAssignment,
  SyntaxKind,
} from 'typescript'
import { GQLAssistConfig } from '../../config'
import {
  addDecorator,
  addImports,
  addNullability,
  createImport,
  getDecorator,
  getName,
  getPropertyOrMethodType,
  hasDecorator,
  isArrayType,
  isEnumType,
  isNullable,
  isNullableFromDecorator,
  isPrimitiveType,
  organizeImports,
  transformName,
} from '../../ts'
import { Context, createContext } from '../context'
import { isResponse } from '../model/model-generator'

function toTypeORMType(type: string) {
  switch (type) {
    case 'string':
      return 'text'
    case 'number':
      return 'int'
    case 'boolean':
      return 'boolean'
    case 'Date':
      return 'timestamp'
    default:
      return type
  }
}

function createColumnDecorator(
  node: ts.PropertyDeclaration | ts.MethodDeclaration,
  enums: string[],
  context: Context,
) {
  const decoratorName = 'Column'
  const argumentsArray: ts.Expression[] = []
  context.imports.push(createImport('typeorm', decoratorName))
  const isId = getName(node) === 'id'
  if (isId) {
    context.imports.push(createImport('typeorm', 'PrimaryColumn'))
    return factory.createDecorator(
      factory.createCallExpression(
        factory.createIdentifier('PrimaryColumn'),
        undefined,
        argumentsArray,
      ),
    )
  }
  const type = getPropertyOrMethodType(node, context.config.behaviour.defaultNumberType)
  const isNull =
    isNullableFromDecorator(node) || isNullable(node, context.config.behaviour.nullableByDefault)
  const isEnum = enums.includes(type)
  const propertyAssignments: PropertyAssignment[] = []

  if (isNull && !isId) {
    propertyAssignments.push(
      factory.createPropertyAssignment(factory.createIdentifier('nullable'), factory.createTrue()),
    )
  }

  if (isArrayType(node)) {
    if (!isEnum) {
      propertyAssignments.push(
        factory.createPropertyAssignment(
          factory.createIdentifier('type'),
          factory.createStringLiteral(toTypeORMType(type), false),
        ),
      )
    }
    propertyAssignments.push(
      factory.createPropertyAssignment(factory.createIdentifier('array'), factory.createTrue()),
    )
  }

  if (isEnum) {
    propertyAssignments.push(
      factory.createPropertyAssignment(
        factory.createIdentifier('type'),
        factory.createStringLiteral('enum', false),
      ),
    )
    propertyAssignments.push(
      factory.createPropertyAssignment(
        factory.createIdentifier('enum'),
        factory.createIdentifier(type),
      ),
    )
  }

  if (propertyAssignments.length) {
    argumentsArray.push(factory.createObjectLiteralExpression(propertyAssignments, false))
  }

  return factory.createDecorator(
    factory.createCallExpression(
      factory.createIdentifier(decoratorName),
      undefined,
      argumentsArray,
    ),
  )
}

function getByFromDecorator(node: ts.PropertyDeclaration | ts.MethodDeclaration) {
  const byDecorator = getDecorator(node, 'By')
  if (byDecorator) {
    const argument = (byDecorator.expression as ts.CallExpression).arguments[0]
    if (ts.isStringLiteral(argument)) {
      return argument.text
    }
  }
  return undefined
}

function createOneToManyDecorator(
  node: ts.PropertyDeclaration | ts.MethodDeclaration,
  context: Context,
) {
  const isEnum = isEnumType(node)
  const isArray = isArrayType(node)
  const isReferenceType = !isPrimitiveType(node)
  if (!isReferenceType || !isArray || isEnum) return
  const type = getPropertyOrMethodType(node, context.config.behaviour.defaultNumberType)
  const relatedEntity = type.replace('[]', '')
  context.imports.push(createImport('typeorm', 'OneToMany'))

  const propertyName = getByFromDecorator(node)
  if (!propertyName) return

  return factory.createDecorator(
    factory.createCallExpression(factory.createIdentifier('OneToMany'), undefined, [
      factory.createArrowFunction(
        undefined,
        undefined,
        [],
        undefined,
        factory.createToken(SyntaxKind.EqualsGreaterThanToken),
        factory.createIdentifier(relatedEntity),
      ),
      factory.createArrowFunction(
        undefined,
        undefined,
        [
          factory.createParameterDeclaration(
            undefined,
            undefined,
            factory.createIdentifier('post'),
            undefined,
            undefined,
          ),
        ],
        undefined,
        factory.createToken(SyntaxKind.EqualsGreaterThanToken),
        factory.createPropertyAccessExpression(
          factory.createIdentifier('post'),
          factory.createIdentifier(propertyName),
        ),
      ),
      factory.createObjectLiteralExpression(
        [
          factory.createPropertyAssignment(
            factory.createIdentifier('nullable'),
            factory.createTrue(),
          ),
        ],
        false,
      ),
    ]),
  )
}

function createClassDecorator(context: Context) {
  const argumentsArray: ts.Expression[] = []
  context.imports.push(createImport('typeorm', 'Entity'))
  return ts.factory.createDecorator(
    ts.factory.createCallExpression(
      ts.factory.createIdentifier('Entity'),
      undefined,
      argumentsArray,
    ),
  )
}

function processClassDeclaration(
  classDeclaration: ts.ClassDeclaration,
  enums: string[],
  context: Context,
) {
  return ts.visitEachChild(
    addDecorator(classDeclaration, createClassDecorator(context)),
    node => {
      if (ts.isPropertyDeclaration(node) && ts.isIdentifier(node.name)) {
        const isArray = isArrayType(node)
        const isEnum = isEnumType(node)
        const byDecorator = getDecorator(node, 'By')
        const decorator =
          byDecorator && !isEnum && isArray
            ? createOneToManyDecorator(node, context)
            : createColumnDecorator(node, enums, context)
        if (!decorator) return node
        return addDecorator(
          addNullability(
            transformName(node, toCamelCase),
            context.config.behaviour.nullableByDefault,
          ),
          decorator,
        )
      }
      return node
    },
    undefined,
  )
}

export function isEntity(sourceFile: ts.SourceFile, config: GQLAssistConfig): boolean {
  const { fileName } = sourceFile
  if (!config.model.enable) return false
  return (
    !!config?.model?.fileExtensions?.find(i => fileName.endsWith(i)) ||
    sourceFile.statements.some(statement => hasDecorator(statement, 'Entity'))
  )
}

export async function generateEntity(
  sourceFile: ts.SourceFile,
  config: GQLAssistConfig,
): Promise<ts.SourceFile> {
  if (!isEntity(sourceFile, config) && !isResponse(sourceFile, config)) return sourceFile
  const context = createContext({ config })
  const enums = sourceFile.statements.filter(isEnumDeclaration).map(node => getName(node as any))
  const updatedSourcefile = ts.visitEachChild(
    sourceFile,
    node => {
      if (isClassDeclaration(node)) return processClassDeclaration(node, enums, context)
      return node
    },
    undefined,
  )
  return organizeImports(addImports(updatedSourcefile, context.imports))
}
