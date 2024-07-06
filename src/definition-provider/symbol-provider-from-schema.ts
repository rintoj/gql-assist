import * as gql from 'graphql'
import { Range } from '../diff'
import {
  getGQLNodeRangeWithoutDescription,
  isEnumTypeDefinition,
  isInputObjectTypeDefinition,
  isInterfaceTypeDefinition,
  isObjectTypeDefinitionNode,
} from '../gql'

export type SymbolType =
  | 'Scalar'
  | 'Type'
  | 'Enum'
  | 'Input'
  | 'Field'
  | 'Union'
  | 'Interface'
  | 'EnumMember'

export interface SymbolInformation {
  name: string
  containerName: string
  type: SymbolType
  range: Range
  children: SymbolInformation[]
}

function toType(
  node:
    | gql.TypeDefinitionNode
    | gql.FieldDefinitionNode
    | gql.InputValueDefinitionNode
    | gql.EnumValueDefinitionNode,
): SymbolType {
  switch (node.kind) {
    case gql.Kind.ENUM_TYPE_DEFINITION:
      return 'Enum'
    case gql.Kind.SCALAR_TYPE_DEFINITION:
      return 'Scalar'
    case gql.Kind.OBJECT_TYPE_DEFINITION:
      return 'Type'
    case gql.Kind.INPUT_OBJECT_TYPE_DEFINITION:
      return 'Input'
    case gql.Kind.UNION_TYPE_DEFINITION:
      return 'Union'
    case gql.Kind.INTERFACE_TYPE_DEFINITION:
      return 'Interface'
    case gql.Kind.FIELD_DEFINITION:
    case gql.Kind.INPUT_VALUE_DEFINITION:
      return 'Field'
    case gql.Kind.ENUM_VALUE_DEFINITION:
      return 'EnumMember'
  }
}

function parseChildren(node: gql.TypeDefinitionNode) {
  const symbols: SymbolInformation[] = []
  if (
    isObjectTypeDefinitionNode(node) ||
    isInputObjectTypeDefinition(node) ||
    isInterfaceTypeDefinition(node)
  ) {
    for (const field of node.fields ?? []) {
      symbols.push({
        name: field.name.value,
        containerName: node.name.value,
        type: toType(field),
        range: getGQLNodeRangeWithoutDescription(field),
        children: [],
      })
    }
  }
  if (isEnumTypeDefinition(node)) {
    for (const field of node.values ?? []) {
      symbols.push({
        name: field.name.value,
        containerName: node.name.value,
        type: toType(field),
        range: getGQLNodeRangeWithoutDescription(field),
        children: [],
      })
    }
  }
  return symbols
}

export function provideSymbolsFromSchema(source: string) {
  try {
    const document = gql.parse(source)
    const symbols: SymbolInformation[] = []
    let parent: string | undefined
    const processNode = (node: gql.TypeDefinitionNode) => {
      symbols.push({
        name: node.name.value,
        containerName: '',
        type: toType(node),
        range: getGQLNodeRangeWithoutDescription(node),
        children: parseChildren(node),
      })
    }
    gql.visit(document, {
      EnumTypeDefinition(node) {
        return processNode(node)
      },
      ScalarTypeDefinition(node) {
        return processNode(node)
      },
      ObjectTypeDefinition(node) {
        return processNode(node)
      },
      InputObjectTypeDefinition(node) {
        return processNode(node)
      },
      UnionTypeDefinition(node) {
        return processNode(node)
      },
      InterfaceTypeDefinition(node) {
        return processNode(node)
      },
    })
    return symbols
  } catch (e) {
    console.error(e)
    return []
  }
}
