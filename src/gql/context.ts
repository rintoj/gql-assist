import ts from 'typescript'

export interface Context {
  imports: ts.ImportDeclaration[]
}

export function createContext(context?: Context) {
  return {
    ...context,
    imports: context?.imports ?? [],
  }
}
