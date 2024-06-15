import * as gql from 'graphql'
import ts from 'typescript'
import { GQLAssistConfig } from '../config'
import { Diagnostic } from '../diagnostic'
import { Position } from '../diff'
import { toNonNullArray } from 'tsds-tools'

export type Parent = gql.ObjectTypeDefinitionNode

export interface GraphQLContext {
  schema: gql.DocumentNode
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
    parents: !nextParent ? context.parents ?? [] : [...(context.parents ?? []), nextParent],
  }
}
