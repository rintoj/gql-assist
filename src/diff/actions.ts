import { Token } from './token'

export enum EditActionType {
  INSERT = 'INSERT',
  REPLACE = 'REPLACE',
  DELETE = 'DELETE',
}

export interface InsertAction {
  type: EditActionType.INSERT
  token: Token
}

export interface ReplaceAction {
  type: EditActionType.REPLACE
  token: Token
}

export interface DeleteAction {
  type: EditActionType.DELETE
  token: Token
}

export type EditAction = InsertAction | ReplaceAction | DeleteAction

export function createInsert(token: Token): InsertAction {
  return { type: EditActionType.INSERT, token }
}

export function createReplace(token: Token): ReplaceAction {
  return { type: EditActionType.REPLACE, token }
}

export function createDelete(token: Token): DeleteAction {
  return { type: EditActionType.DELETE, token }
}
