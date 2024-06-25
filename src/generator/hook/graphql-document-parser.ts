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
  getNodeName,
  hasAQuery,
  isFieldNode,
  isOperationDefinitionNode,
  toJSType,
  updateArguments,
  updateName,
  updateVariableDefinitions,
} from '../../gql'
import { createArrayType, createType } from '../../ts'
import { camelCase, className, toString } from '../../util'
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

function processUnionType(unionType: gql.GraphQLUnionType, context: GraphQLDocumentParserContext) {
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
  context: GraphQLDocumentParserContext,
) {
  const type = gql.getNamedType(schemaType)
  if (!type) return 'never'
  if (gql.isEnumType(schemaType)) return type.name
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
  context: GraphQLDocumentParserContext,
) {
  const fields = schemaType.getFields()
  return toNonNullArray(
    node.selectionSet?.selections.map(selection => {
      if (isFieldNode(selection)) {
        const name = selection.name.value
        const fieldType = fields?.[name]?.type
        const namedType = gql.getNamedType(fieldType)
        if (gql.isEnumType(namedType)) processEnum(namedType, context)
        if (gql.isUnionType(namedType)) processUnionType(namedType, context)
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

function parseInputType(schemaType: gql.GraphQLInputType, context: GraphQLDocumentParserContext) {
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
            if (gql.isEnumType(field.type)) processEnum(field.type, context)
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
    processEnum(type, context)
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
  context: GraphQLDocumentParserContext,
) {
  if (!parentType || !gql.isObjectType(parentType)) return
  const field = parentType.getFields()[node.name.value]
  const args = field.args ?? []
  const updatedArgs = args.map((arg: any) => {
    const schemaType = arg.type
    const typeName = resolveArgName(schemaType)
    const isArray = gql.isListType(gql.getNullableType(schemaType))
    const isNullable = gql.isNullableType(schemaType)
    const hash = toString(node.name.value, arg.name)
    const parameterName = context.toParameterName(hash, arg.name, node.name?.value)
    parseInputType(schemaType, context)
    context.addParameter(
      {
        name: parameterName,
        type: typeName,
        isNullable,
        isArray,
      },
      createArgumentDefinition(arg, parameterName),
    )
    return createInputValueDefinition(arg.name, parameterName)
  })
  return updateArguments(node, updatedArgs)
}

function parseType(
  node: gql.OperationDefinitionNode | gql.FieldNode | gql.InlineFragmentNode,
  schemaType: gql.GraphQLObjectType | undefined,
  context: GraphQLDocumentParserContext,
) {
  const nodeName = getNodeName(node)
  if (!schemaType || !node.selectionSet?.selections.length) {
    return console.log('No selectors for node', nodeName)
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

  return interfaceName
}

function addVariableDefinitions(document: gql.DocumentNode, context: GraphQLDocumentParserContext) {
  return {
    ...document,
    definitions: document.definitions.map(def => {
      if (!isOperationDefinitionNode(def)) return def
      return updateVariableDefinitions(def, Object.values(context.variableDefinition))
    }),
  }
}

function preprocessDocument(document: gql.DocumentNode, schema: gql.GraphQLSchema) {
  const typeInfo = new gql.TypeInfo(schema)
  return gql.visit(
    document,
    gql.visitWithTypeInfo(typeInfo, {
      OperationDefinition(node: gql.OperationDefinitionNode) {
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
        return { ...node, arguments: type?.args.map(arg => createInputValueDefinition(arg.name)) }
      },
    }),
  )
}

export function parseDocument(document: gql.DocumentNode, schema: gql.GraphQLSchema) {
  const typeInfo = new gql.TypeInfo(schema)
  const context = new GraphQLDocumentParserContext(typeInfo)
  const fixedDoc = preprocessDocument(document, schema)
  const doc = gql.visit(
    fixedDoc,
    gql.visitWithTypeInfo(typeInfo, {
      OperationDefinition(node: gql.OperationDefinitionNode) {
        const type = gql.getNamedType(typeInfo.getType())
        if (gql.isObjectType(type)) {
          parseType(node, type, context)
        } else {
          context.reportError(`No valid type found for ${node.operation} ${node.name?.value}`, node)
        }
        return node
      },
      Field(node) {
        const type = gql.getNamedType(typeInfo.getType())
        const parent = typeInfo.getParentType()
        if (gql.isObjectType(type)) {
          parseType(node, type, context)
        } else {
          context.reportError(`No valid type found for ${node.name?.value}`, node)
        }
        return parseArguments(node, parent, context)
      },
      InlineFragment(node) {
        const type = gql.getNamedType(typeInfo.getType())
        const parent = typeInfo.getParentType()
        if (gql.isObjectType(type)) {
          parseType(node, type, context)
        } else {
          context.reportError(`No valid type found for ${node.typeCondition?.name?.value}`, node)
        }
        return node
      },
    }),
  )
  const isQueryType = hasAQuery(doc)
  const parameters = Object.values(context.parameters)
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
  return {
    document: addVariableDefinitions(doc, context),
    types: Object.values(context.types).filter(i => !!i),
  }
}
