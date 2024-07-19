import * as gql from 'graphql'
import { toNonNullArray } from 'tsds-tools'
import ts from 'typescript'
import { GQLAssistConfig } from '../config'
import { Diagnostic } from '../diagnostic'
import { Position } from '../position'

export type Parent = gql.ObjectTypeDefinitionNode | gql.UnionTypeDefinitionNode

export interface GraphQLContext {
  schema: gql.GraphQLSchema
  config: GQLAssistConfig
  sourceFile: ts.SourceFile
  parent?: Parent
  offset?: Position
  parents: Parent[]
  path: string[]
  diagnostics: Diagnostic[]
}

export function createGraphQLContext(
  context: Omit<GraphQLContext, 'parents' | 'diagnostics' | 'path'> &
    Partial<Pick<GraphQLContext, 'parents' | 'diagnostics' | 'path'>>,
  path: string | undefined,
  nextParent?: Parent,
): GraphQLContext {
  return {
    ...context,
    diagnostics: context.diagnostics ?? [],
    path: toNonNullArray((context.path ?? []).concat(path as string)),
    parent: nextParent,
    parents: !nextParent ? (context.parents ?? []) : [...(context.parents ?? []), nextParent],
  }
}
