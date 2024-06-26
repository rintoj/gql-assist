import * as gql from 'graphql'
import { toClassName } from 'name-util'
import { ById, toNonNullArray } from 'tsds-tools'
import ts from 'typescript'
import { GQLAssistConfig } from '../config'
import { Position } from '../diff'
import { FieldDef, extractTypeDefinitions } from '../gql'
import { getGQLNodeLocationRange } from '../gql/get-gql-node-location-range'
import { isPositionWithInRange } from '../position'
import { getGQLContent, getGraphQLQueryVariable, getTSNodeLocationRange } from '../ts'

function isInRange(node: gql.ASTNode, position: Position, offset?: Position) {
  const nodeRange = getGQLNodeLocationRange(node, offset)
  return isPositionWithInRange(position, nodeRange)
}

export function autoCompleteHook(
  sourceFile: ts.SourceFile,
  position: Position,
  schema: gql.GraphQLSchema,
  config: GQLAssistConfig,
) {
  const variable = getGraphQLQueryVariable(sourceFile)
  if (!variable) return

  const range = getTSNodeLocationRange(variable, sourceFile)
  if (!isPositionWithInRange(position, range)) return

  const graphQLQueryString = getGQLContent(variable)
  if (!graphQLQueryString || graphQLQueryString?.trim() === '') return

  const offset = new Position(range.start.line, 0)
  const schemaDef = extractTypeDefinitions(schema)

  try {
    const document = gql.parse(graphQLQueryString)

    let possibleParent: ById<FieldDef> | undefined
    let parent: ById<FieldDef> | undefined
    let fields: string[] | undefined
    gql.visit(document, {
      OperationDefinition(node) {
        if (isInRange(node, position, offset)) {
          possibleParent = schemaDef[toClassName(node.operation)]
        }
      },

      Field(node) {
        if (isInRange(node, position, offset)) {
          const type = parent?.[node.name.value]?.type
          possibleParent = type ? schemaDef[type] : undefined
        }
      },

      SelectionSet(node) {
        if (isInRange(node, position, offset)) {
          fields = toNonNullArray(
            node.selections.map(s => (s.kind === gql.Kind.FIELD ? s.name.value : undefined)),
          )
          parent = possibleParent
        }
      },
    })
    if (!fields) return parent
    if (parent) {
      return Object.keys(parent)
        .filter(key => !(fields ?? []).includes(key))
        .reduce((a, i) => ({ ...a, [i]: possibleParent?.[i] }), {})
    }
  } catch (e) {
    console.error(e)
  }
}
