import * as gql from 'graphql'
import { toNonNullArray } from 'tsds-tools'
import ts from 'typescript'
import {
  createArgumentDefinition,
  createInputValueDefinition,
  toJSType,
  updateArgName,
  updateArguments,
  updateName,
  updateVariableDefinitions,
} from '../../gql'
import { createArrayType, createType } from '../../ts'
import { camelCase, toString } from '../../util'
import { GraphQLDocumentParserContext } from './graphql-document-parser-context'

function processEnum(enumType: gql.GraphQLEnumType, context: GraphQLDocumentParserContext) {
  const members = enumType
    .getValues()
    .map(value =>
      ts.factory.createEnumMember(
        ts.factory.createIdentifier(value.name),
        ts.factory.createStringLiteral(value.name),
      ),
    )
  context.addEnum(
    ts.factory.createEnumDeclaration(
      [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
      ts.factory.createIdentifier(enumType.name),
      members,
    ),
  )
}

function resolveTypeName(
  selection: gql.FieldNode,
  schemaType: gql.GraphQLOutputType,
  context: GraphQLDocumentParserContext,
) {
  const type = gql.getNamedType(schemaType)
  if (!type) return 'never'
  if (gql.isEnumType(schemaType)) return type.name
  if (gql.isScalarType(type)) return toJSType(type)
  return context.toInterfaceName(updateName({ ...selection }, selection.name.value), type.name)
}

function parseFields(
  node: gql.OperationDefinitionNode | gql.FieldNode,
  context: GraphQLDocumentParserContext,
) {
  const parent = context.parent()
  if (!parent || !node.selectionSet?.selections?.length) return []
  const fields = context.getFields()
  return toNonNullArray(
    node.selectionSet.selections.map(selection => {
      if (selection.kind === gql.Kind.FIELD) {
        const name = selection.name.value
        const schemaType = fields?.[name]?.type
        if (gql.isEnumType(schemaType)) processEnum(schemaType, context)
        if (!schemaType) return
        const typeName = resolveTypeName(selection, schemaType, context)
        const isArray = gql.isListType(gql.getNullableType(schemaType))
        const isNullable = gql.isNullableType(schemaType)

        return ts.factory.createPropertySignature(
          undefined,
          ts.factory.createIdentifier(name),
          isNullable ? ts.factory.createToken(ts.SyntaxKind.QuestionToken) : undefined,
          isArray ? createArrayType(typeName) : createType(typeName),
        )
      }
    }),
  )
}

function resolveArgName(
  arg: gql.GraphQLArgument,
  schemaType: gql.GraphQLInputType,
  context: GraphQLDocumentParserContext,
) {
  const type = gql.getNamedType(schemaType)
  if (!type) return 'never'
  if (gql.isEnumType(schemaType)) return type.name
  if (gql.isScalarType(type)) return toJSType(type)
  return type.name
}

function parseArguments(node: gql.FieldNode, context: GraphQLDocumentParserContext) {
  const field = context.typeInfo.getParentType()?.getFields?.()?.[node.name.value]
  if (!field) return node
  const args = field.args ?? []
  const updatedArgs = args.map(arg => {
    const schemaType = arg.type
    const typeName = resolveArgName(arg, schemaType, context)
    const isArray = gql.isListType(gql.getNullableType(schemaType))
    const isNullable = gql.isNullableType(schemaType)
    const parameterName = context.toParameterName(
      updateArgName(arg, camelCase(node.name?.value as string, arg.name)),
    )
    context.addParameter(
      parameterName,
      ts.factory.createPropertySignature(
        undefined,
        ts.factory.createIdentifier(parameterName),
        isNullable ? ts.factory.createToken(ts.SyntaxKind.QuestionToken) : undefined,
        isArray ? createArrayType(typeName, 'undefined') : createType(typeName, 'undefined'),
      ),
      createArgumentDefinition(arg, parameterName),
    )

    return createInputValueDefinition(arg.name, parameterName)
  })
  return updateArguments(node, updatedArgs)
}

function parseType(
  node: gql.OperationDefinitionNode | gql.FieldNode,
  context: GraphQLDocumentParserContext,
) {
  const parent = context.parent()
  if (!parent || !gql.isObjectType(parent) || !node.selectionSet?.selections?.length) {
    return node.name?.value
  }

  const fields = parseFields(node, context).concat(
    ts.factory.createPropertySignature(
      undefined,
      ts.factory.createIdentifier('__typename'),
      ts.factory.createToken(ts.SyntaxKind.QuestionToken),
      createType(toString("'", parent.name, "'")),
    ),
  )

  const interfaceName = context.toInterfaceName(node, parent?.name)

  context.addInterface(
    ts.factory.createInterfaceDeclaration(
      [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
      ts.factory.createIdentifier(interfaceName),
      undefined,
      undefined,
      fields,
    ),
  )

  return interfaceName
}

function addVariableDefinitions(document: gql.DocumentNode, context: GraphQLDocumentParserContext) {
  return {
    ...document,
    definitions: document.definitions.map(def => {
      if (def.kind !== gql.Kind.OPERATION_DEFINITION) return def
      return updateVariableDefinitions(def, Object.values(context.variableDefinition))
    }),
  }
}

function preprocessDocument(document: gql.DocumentNode, schema: gql.GraphQLSchema) {
  const typeInfo = new gql.TypeInfo(schema)
  return gql.visit(
    document,
    gql.visitWithTypeInfo(typeInfo, {
      Field(node) {
        const type = typeInfo.getFieldDef()
        return { ...node, arguments: type?.args.map(arg => createInputValueDefinition(arg.name)) }
      },
    }),
  )
}

export function parseDocument(document: gql.DocumentNode, schema: gql.GraphQLSchema) {
  const typeInfo = new gql.TypeInfo(schema)
  const context = new GraphQLDocumentParserContext(typeInfo)
  const doc = gql.visit(
    preprocessDocument(document, schema),
    gql.visitWithTypeInfo(typeInfo, {
      OperationDefinition(node: gql.OperationDefinitionNode) {
        const interfaceName = parseType(node, context)
        return updateName(node, camelCase(interfaceName))
      },
      Field(node) {
        if (!!node.selectionSet?.selections?.length) {
          parseType(node, context)
        }
        return parseArguments(node, context)
      },
    }),
  )
  const parameters = Object.values(context.parameters)
  if (parameters.length) {
    context.addInterface(
      ts.factory.createInterfaceDeclaration(
        [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
        ts.factory.createIdentifier('Variables'),
        undefined,
        undefined,
        parameters,
      ),
    )
  }
  return { document: addVariableDefinitions(doc, context), types: Object.values(context.types) }
}
