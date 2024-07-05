import * as gql from 'graphql'
import { Range } from '../diff'
import { getGQLNodeRangeWithoutDescription, makeQueryParsable } from '../gql'

export type SymbolType = 'Scalar' | 'Type' | 'Enum' | 'Input' | 'Field' | 'Union' | 'Interface'

export interface SymbolInformation {
  name: string
  containerName: string
  type: SymbolType
  range: Range
}

function toType(node: gql.TypeDefinitionNode | gql.FieldDefinitionNode): SymbolType {
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
      return 'Field'
  }
}

export function provideSymbolsFromSchema(source: string) {
  try {
    const document = gql.parse(source)
    const symbols: SymbolInformation[] = []
    let parent: string | undefined
    const processNode = (node: gql.TypeDefinitionNode | gql.FieldDefinitionNode) => {
      let containerName = parent ?? 'schema'
      if (node.kind !== gql.Kind.FIELD_DEFINITION) {
        parent = node.name.value
      }
      symbols.push({
        name: node.name.value,
        containerName,
        type: toType(node),
        range: getGQLNodeRangeWithoutDescription(node),
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
      FieldDefinition(node) {
        return processNode(node)
      },
    })
    return symbols
  } catch (e) {
    console.error(e)
    return []
  }
}
