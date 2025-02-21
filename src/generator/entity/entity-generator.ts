import { toCamelCase } from 'name-util'
import ts, { factory, isClassDeclaration } from 'typescript'
import { GQLAssistConfig } from '../../config'
import {
  addDecorator,
  addImports,
  addNullability,
  createImport,
  getName,
  getPropertyOrMethodType,
  hasDecorator,
  isArrayType,
  isNullable,
  isNullableFromDecorator,
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
  const isArray = isArrayType(node)
  if (isNull || isArray) {
    argumentsArray.push(
      factory.createObjectLiteralExpression(
        [
          isArray && type
            ? factory.createPropertyAssignment(
                factory.createIdentifier('type'),
                factory.createStringLiteral(toTypeORMType(type), false),
              )
            : (undefined as any),
          isNull
            ? factory.createPropertyAssignment(
                factory.createIdentifier('nullable'),
                factory.createTrue(),
              )
            : (undefined as any),
          isArray
            ? factory.createPropertyAssignment(
                factory.createIdentifier('array'),
                factory.createTrue(),
              )
            : (undefined as any),
        ].filter(i => !!i),
        false,
      ),
    )
  }

  return factory.createDecorator(
    factory.createCallExpression(
      factory.createIdentifier(decoratorName),
      undefined,
      argumentsArray,
    ),
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

function processClassDeclaration(classDeclaration: ts.ClassDeclaration, context: Context) {
  return ts.visitEachChild(
    addDecorator(classDeclaration, createClassDecorator(context)),
    node => {
      if (ts.isPropertyDeclaration(node) && ts.isIdentifier(node.name)) {
        return addDecorator(
          addNullability(
            transformName(node, toCamelCase),
            context.config.behaviour.nullableByDefault,
          ),
          createColumnDecorator(node, context),
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
