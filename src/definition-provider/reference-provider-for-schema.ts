import { globStream } from 'fast-glob'
import * as gql from 'graphql'
import { Location, Position } from '../diff'
import { getGQLNodeRange, getGQLNodeRangeWithoutDescription, makeQueryParsable } from '../gql'
import { isPositionWithInRange } from '../position/is-position-within-range'
import { parseGraphQLDocumentFromTS, readTSFile } from '../ts'

interface SelectedField {
  parent: string
  name: string
}

function isInRange(node: gql.ASTNode, position: Position, offset?: Position) {
  const nodeRange = getGQLNodeRange(node, offset)
  return isPositionWithInRange(position, nodeRange, true)
}

function referencesByType(
  document: gql.DocumentNode,
  sourcePath: string,
  type: string | undefined,
) {
  if (!type) return []
  const locations: Location[] = []
  gql.visit(document, {
    NamedType(node) {
      if (node.name.value !== type) return
      locations.push(new Location(sourcePath, getGQLNodeRangeWithoutDescription(node)))
    },
  })
  return locations
}

function processFile(file: string, field: SelectedField, schema: gql.GraphQLSchema) {
  const locations: Location[] = []
  try {
    const sourceFile = readTSFile(file)
    const { document, offset } = parseGraphQLDocumentFromTS(sourceFile)
    if (!document) return locations
    const typeInfo = new gql.TypeInfo(schema)
    gql.visit(
      document,
      gql.visitWithTypeInfo(typeInfo, {
        Field(node) {
          if (node.name.value !== field.name) return
          const parent = typeInfo.getParentType()
          if (!parent || parent.name !== field.parent) return
          locations.push(new Location(file, getGQLNodeRange(node.name, offset)))
        },
      }),
    )
  } catch (e) {
    console.log(`Failed to process file ${file}`, e.message)
  }
  return locations
}

async function referencesByField(
  schema: gql.GraphQLSchema,
  field: SelectedField | undefined,
  pattern: string,
) {
  if (!field || !pattern) return []
  const stream = globStream(pattern)
  let locations: Location[] = []
  for await (const file of stream) {
    locations = locations.concat(processFile(file as string, field, schema))
  }
  return locations
}

export async function provideReferenceForSchema(
  source: string,
  sourcePath: string,
  position: Position,
  pattern: string,
) {
  try {
    const fixed = makeQueryParsable(source)
    const document = gql.parse(fixed)
    let type: string | undefined
    let selectedField: SelectedField | undefined
    const processNode = (node: gql.NameNode) => {
      if (!isInRange(node, position)) return
      type = node.value
      return gql.BREAK
    }
    const processField = (node: gql.TypeDefinitionNode) => {
      switch (node.kind) {
        case gql.Kind.OBJECT_TYPE_DEFINITION:
        case gql.Kind.INPUT_OBJECT_TYPE_DEFINITION:
        case gql.Kind.INTERFACE_TYPE_DEFINITION:
          for (const field of node.fields ?? []) {
            if (isInRange(field, position)) {
              selectedField = { parent: node.name.value, name: field.name.value }
              return gql.BREAK
            }
          }
      }
    }
    gql.visit(document, {
      Name(node) {
        return processNode(node)
      },
      EnumTypeDefinition(node) {
        for (const value of node.values ?? []) {
          if (isInRange(value.name, position)) {
            selectedField = { parent: node.name.value, name: value.name.value }
            return
          }
        }
      },
      ObjectTypeDefinition(node) {
        return processField(node)
      },
      InterfaceTypeDefinition(node) {
        return processField(node)
      },
      InputObjectTypeDefinition(node) {
        return processField(node)
      },
    })
    if (type) {
      return referencesByType(document, sourcePath, type)
    }
    const schema = gql.buildSchema(source)
    return await referencesByField(schema, selectedField, pattern)
  } catch (e) {
    console.error(e)
    return []
  }
}
