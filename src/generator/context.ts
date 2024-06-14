import ts from 'typescript'
import { GQLAssistConfig, config } from '../config'

export interface Context {
  config: GQLAssistConfig
  imports: ts.ImportDeclaration[]
}

export function createContext(context?: Partial<Context>) {
  return {
    config,
    imports: [],
    ...context,
  }
}
