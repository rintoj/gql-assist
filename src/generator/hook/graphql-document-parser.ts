import * as gql from 'graphql'
import { Maybe } from 'graphql/jsutils/Maybe'
import { toCamelCase } from 'name-util'
import { toNonNullArray } from 'tsds-tools'
import ts from 'typescript'
import {
  createArgumentDefinition,
  createInputValueDefinition,
  getFieldHash,
  getFieldName,
  hasAQuery,
  isArgumentNode,
  isFieldNode,
  isInputValueDefinitionNode,
  isOperationDefinitionNode,
  isVariableNode,
  toJSType,
  updateArguments,
  updateName,
  updateVariableDefinitions,
} from '../../gql'
import { createArrayType, createType } from '../../ts'
import { camelCase, className, toString } from '../../util'
import { GraphQLParserContext } from './graphql-parser-context'

function parseEnum(enumType: gql.GraphQLEnumType, context: GraphQLParserContext) {
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

function parseUnionType(unionType: gql.GraphQLUnionType, context: GraphQLParserContext) {
  context.addUnion(
    ts.factory.createTypeAliasDeclaration(
      [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
      ts.factory.createIdentifier(unionType.name),
      undefined,
      ts.factory.createUnionTypeNode(
        unionType
          .getTypes()
          .map(type =>
            ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(type.name), undefined),
          ),
      ),
    ),
  )
}

function resolveTypeName(
  node: gql.FieldNode,
  schemaType: gql.GraphQLOutputType,
  context: GraphQLParserContext,
) {
  const type = gql.getNamedType(schemaType)
  if (!type) return 'never'
  if (gql.isEnumType(type)) return type.name
  if (gql.isScalarType(type)) return toJSType(type)
  if (gql.isObjectType(type)) {
    return context.toInterfaceName(getFieldHash(type.name, node), type.name, getFieldName(node))
  }
  if (gql.isUnionType(type)) {
    return context.toInterfaceName(getFieldHash(type.name, node), type.name, getFieldName(node))
  }
  throw new Error(`Unable to process ${type.name} of kind ${type.astNode?.kind}`)
}

function parseFields(
  node: gql.OperationDefinitionNode | gql.FieldNode | gql.InlineFragmentNode,
  schemaType: gql.GraphQLObjectType,
  context: GraphQLParserContext,
) {
  const fields = schemaType.getFields()
  return toNonNullArray(
    node.selectionSet?.selections.map(selection => {
      if (isFieldNode(selection)) {
        const name = selection.name.value
        const fieldType = fields?.[name]?.type
        if (!fieldType) return
        const typeName = resolveTypeName(selection, fieldType, context)
        const isArray = gql.isListType(gql.getNullableType(fieldType))
        const isNullable = gql.isNullableType(fieldType)
        return ts.factory.createPropertySignature(
          undefined,
          ts.factory.createIdentifier(name),
          isNullable ? ts.factory.createToken(ts.SyntaxKind.QuestionToken) : undefined,
          isArray ? createArrayType(typeName) : createType(typeName),
        )
      }
    }) ?? [],
  )
}

function resolveArgName(schemaType: gql.GraphQLInputType) {
  const type = gql.getNamedType(schemaType)
  if (!type) return 'never'
  if (gql.isEnumType(schemaType)) return type.name
  if (gql.isScalarType(type)) return toJSType(type)
  return type.name
}

function parseInputType(schemaType: gql.GraphQLInputType, context: GraphQLParserContext) {
  const type = gql.getNamedType(schemaType)
  if (gql.isInputObjectType(type)) {
    const fields = Object.values(type.getFields())
    context.addInterface(
      ts.factory.createInterfaceDeclaration(
        [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
        ts.factory.createIdentifier(type.name),
        undefined,
        undefined,
        fields
          .map(field => {
            const isNullable = !gql.isNonNullType(field.type)
            const isArray = gql.isListType(gql.getNullableType(field.type))
            const typeName = resolveArgName(field.type)
            parseInputType(field.type, context)
            return ts.factory.createPropertySignature(
              undefined,
              ts.factory.createIdentifier(field.name),
              isNullable ? ts.factory.createToken(ts.SyntaxKind.QuestionToken) : undefined,
              isArray ? createArrayType(typeName) : createType(typeName),
            )
          })
          .concat(createTypeName(type.name)),
      ),
    )
  } else if (gql.isEnumType(type)) {
    parseEnum(type, context)
  }
}

export function createTypeName(name: string) {
  return ts.factory.createPropertySignature(
    undefined,
    ts.factory.createIdentifier('__typename'),
    ts.factory.createToken(ts.SyntaxKind.QuestionToken),
    createType(toString("'", name, "'")),
  )
}

function parseArguments(
  node: gql.FieldNode,
  parentType: Maybe<gql.GraphQLOutputType>,
  context: GraphQLParserContext,
) {
  if (!parentType || !gql.isObjectType(parentType)) return
  const field = parentType.getFields()[node.name.value]
  const args = field?.args ?? []
  const inputs: Record<string, gql.ArgumentNode | gql.InputValueDefinitionNode> = (
    node.arguments ?? []
  ).reduce((a, i) => ({ ...a, [i.name.value]: i }), {})
  args.map(arg => {
    const schemaType = arg.type
    const typeName = resolveArgName(schemaType)
    const isArray = gql.isListType(gql.getNullableType(schemaType))
    const isNullable = gql.isNullableType(schemaType)
    parseInputType(schemaType, context)

    const input = inputs[arg.name]
    let variable = isArgumentNode(input)
      ? input.value
      : isInputValueDefinitionNode(input)
        ? input.type
        : undefined
    const originalVariable = variable && isVariableNode(variable) ? variable.name.value : arg.name
    context.addParameter(
      {
        name: originalVariable,
        type: typeName,
        isNullable,
        isArray,
      },
      createArgumentDefinition(arg, originalVariable),
    )
  })
}

function parseObjectType(
  node: gql.OperationDefinitionNode | gql.FieldNode | gql.InlineFragmentNode,
  schemaType: gql.GraphQLObjectType | undefined,
  context: GraphQLParserContext,
) {
  if (!schemaType || !gql.isObjectType(schemaType) || !node.selectionSet?.selections.length) {
    return
  }
  const fields = parseFields(node, schemaType, context).concat(createTypeName(schemaType.name))
  const interfaceName = context.toInterfaceName(
    getFieldHash(schemaType.name, node),
    isOperationDefinitionNode(node) ? node.name?.value! : schemaType.name,
    getFieldName(node),
  )
  context.addInterface(
    ts.factory.createInterfaceDeclaration(
      [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
      ts.factory.createIdentifier(interfaceName),
      undefined,
      undefined,
      fields,
    ),
  )
}

function addVariableDefinitions(document: gql.DocumentNode, context: GraphQLParserContext) {
  return {
    ...document,
    definitions: document.definitions.map(def => {
      if (!isOperationDefinitionNode(def)) return def
      return updateVariableDefinitions(def, context.getVariableDefinitions())
    }),
  }
}

/**
 * Adds operation name and missing arguments to the document
 *
 * @param document GQL document with query, mutation or subscription
 * @param schema  GQL schema definition
 * @returns gql.DocumentNode
 */
function fixDocument(
  document: gql.DocumentNode,
  schema: gql.GraphQLSchema,
  context: GraphQLParserContext,
) {
  const typeInfo = new gql.TypeInfo(schema)
  let definition: gql.OperationDefinitionNode
  return gql.visit(
    document,
    gql.visitWithTypeInfo(typeInfo, {
      OperationDefinition(node: gql.OperationDefinitionNode) {
        definition = node
        const firstField = toCamelCase(
          node.selectionSet?.selections
            .map(field => isFieldNode(field) && field?.name?.value)
            .join('-and-'),
        )
        const name = toString(
          (node.name?.value ?? camelCase(firstField)).replace(className(node.operation), ''),
          className(node.operation),
        )
        return updateName(node, name)
      },
      Field(node) {
        const type = typeInfo.getFieldDef()
        const argumentsByName: Record<string, any> = (node.arguments ?? []).reduce(
          (a, i) => ({ ...a, [i.name.value]: i }),
          {},
        )
        return updateArguments(
          node,
          type?.args.map(arg => {
            if (argumentsByName[arg.name]) return argumentsByName[arg.name]
            const name = context.toParameterName(arg.name, node.name.value)
            return createInputValueDefinition(arg.name, name)
          }) ?? [],
        )
      },
    }),
  )
}

function createVariablesType(document: gql.DocumentNode, context: GraphQLParserContext) {
  const isQueryType = hasAQuery(document)
  const parameters = context.getParameters()
  if (parameters.length) {
    context.addInterface(
      ts.factory.createInterfaceDeclaration(
        [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
        ts.factory.createIdentifier('Variables'),
        undefined,
        undefined,
        parameters.map(param =>
          ts.factory.createPropertySignature(
            undefined,
            ts.factory.createIdentifier(param.name),
            param.isNullable ? ts.factory.createToken(ts.SyntaxKind.QuestionToken) : undefined,
            param.isArray
              ? createArrayType(param.type, isQueryType ? 'undefined' : undefined)
              : createType(param.type, isQueryType ? 'undefined' : undefined),
          ),
        ),
      ),
    )
  }
}

export function parseDocument(inputDocument: gql.DocumentNode, schema: gql.GraphQLSchema) {
  const typeInfo = new gql.TypeInfo(schema)
  const context = new GraphQLParserContext(typeInfo)
  const document = fixDocument(inputDocument, schema, context)
  gql.visit(
    document,
    gql.visitWithTypeInfo(typeInfo, {
      OperationDefinition(node: gql.OperationDefinitionNode) {
        const type = gql.getNamedType(typeInfo.getType())
        if (gql.isObjectType(type)) {
          parseObjectType(node, type, context)
        }
      },
      Field(node) {
        const type = gql.getNamedType(typeInfo.getType())
        const parent = typeInfo.getParentType()
        if (gql.isObjectType(type)) {
          parseObjectType(node, type, context)
        } else if (gql.isEnumType(type)) {
          parseEnum(type, context)
        } else if (gql.isUnionType(type)) {
          parseUnionType(type, context)
        }
        parseArguments(node, parent, context)
      },
      InlineFragment(node) {
        const type = gql.getNamedType(typeInfo.getType())
        const parent = typeInfo.getParentType()
        if (gql.isObjectType(type)) {
          parseObjectType(node, type, context)
        }
      },
    }),
  )

  createVariablesType(document, context)

  return {
    document: addVariableDefinitions(document, context),
    types: Object.values(context.getTypes()).filter(i => !!i),
  }
}
