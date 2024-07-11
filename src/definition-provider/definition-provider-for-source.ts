import * as gql from 'graphql'
import ts from 'typescript'
import { GQLAssistConfig } from '../config'
import { isEnum, isHook, isInput, isModel } from '../generator'
import { getGQLNodeRange, getGQLNodeRangeWithoutDescription, makeQueryParsable } from '../gql'
import { Location, Position } from '../position'
import { isPositionWithInRange } from '../position/is-position-within-range'
import { getGQLContent, getGraphQLQueryVariable, getTSNodeLocationRange, hasDecorator } from '../ts'

function isInRange(node: gql.ASTNode, position: Position, offset?: Position) {
  const nodeRange = getGQLNodeRange(node, offset)
  return isPositionWithInRange(position, nodeRange, true)
}

function provideDefinitionForGraphQL(
  sourceFile: ts.SourceFile,
  position: Position,
  schema: gql.GraphQLSchema,
  schemaLocation: string,
) {
  const variable = getGraphQLQueryVariable(sourceFile)
  if (!variable) return null

  const range = getTSNodeLocationRange(variable, sourceFile)
  const query = getGQLContent(variable)
  if (!query || query?.trim() === '') return null
  const offset = new Position(range.start.line, 0)

  try {
    const fixed = makeQueryParsable(query)
    const document = gql.parse(fixed)
    let targetNode: gql.ASTNode | undefined | null
    const typeInfo = new gql.TypeInfo(schema)
    gql.visit(
      document,
      gql.visitWithTypeInfo(typeInfo, {
        OperationDefinition(node) {
          if (!isInRange(node, position, offset)) return
          const type = typeInfo.getType()
          targetNode = gql.getNamedType(type)?.astNode
        },
        VariableDefinition(node) {
          if (!isInRange(node, position, offset)) return
          const type = typeInfo.getInputType()
          targetNode = gql.getNamedType(type)?.astNode
        },
        Field(node) {
          if (!isInRange(node, position, offset)) return
          const type = typeInfo.getParentType()
          if (!type || !gql.isObjectType(type)) return
          targetNode = type?.getFields()[node.name.value]?.astNode
        },
      }),
    )
    if (!targetNode) return null
    return new Location(schemaLocation, getGQLNodeRangeWithoutDescription(targetNode))
  } catch (e) {
    console.error(e)
    return null
  }
}

function processClassDeclaration(
  classDeclaration: ts.ClassDeclaration,
  sourceFile: ts.SourceFile,
  position: Position,
  schema: gql.GraphQLSchema,
  schemaLocation: string,
) {
  if (
    !classDeclaration.name ||
    (!hasDecorator(classDeclaration, 'ObjectType') && !hasDecorator(classDeclaration, 'InputType'))
  ) {
    return null
  }
  const range = getTSNodeLocationRange(classDeclaration.name, sourceFile)
  const className = classDeclaration.name.getText()
  if (range && isPositionWithInRange(position, range, true)) {
    const type = schema.getType(className)
    if (type?.astNode) {
      return new Location(schemaLocation, getGQLNodeRange(type.astNode))
    }
  }
}

function processEnumDeclaration(
  enumDeclaration: ts.EnumDeclaration,
  sourceFile: ts.SourceFile,
  position: Position,
  schema: gql.GraphQLSchema,
  schemaLocation: string,
) {
  if (!enumDeclaration.name) {
    return null
  }
  const range = getTSNodeLocationRange(enumDeclaration.name, sourceFile)
  const enumName = enumDeclaration.name.getText()
  if (range && isPositionWithInRange(position, range, true)) {
    const type = schema.getType(enumName)
    if (type?.astNode) {
      return new Location(schemaLocation, getGQLNodeRange(type.astNode))
    }
  }
}

function provideDefinitionForClassAndFields(
  sourceFile: ts.SourceFile,
  position: Position,
  schema: gql.GraphQLSchema,
  schemaLocation: string,
  config: GQLAssistConfig,
) {
  if (isModel(sourceFile, config) || isInput(sourceFile, config)) {
    for (const statement of sourceFile.statements) {
      if (ts.isClassDeclaration(statement)) {
        const location = processClassDeclaration(
          statement,
          sourceFile,
          position,
          schema,
          schemaLocation,
        )
        if (location) return location
      }
    }
  }
  if (isEnum(sourceFile, config)) {
    for (const statement of sourceFile.statements) {
      if (ts.isEnumDeclaration(statement)) {
        const location = processEnumDeclaration(
          statement,
          sourceFile,
          position,
          schema,
          schemaLocation,
        )
        if (location) return location
      }
    }
  }
}

export function provideDefinitionForSource(
  sourceFile: ts.SourceFile,
  position: Position,
  schema: gql.GraphQLSchema,
  schemaLocation: string,
  config: GQLAssistConfig,
) {
  if (isHook(sourceFile, config)) {
    return provideDefinitionForGraphQL(sourceFile, position, schema, schemaLocation)
  }
  return provideDefinitionForClassAndFields(sourceFile, position, schema, schemaLocation, config)
}
