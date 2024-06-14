import ts from 'typescript'

export interface Context {
  imports: ts.ImportDeclaration[]
  gqlLibrary: string
}

export function createContext(context?: Partial<Context>) {
  return {
    ...context,
    imports: context?.imports ?? [],
    gqlLibrary: context?.gqlLibrary ?? '@apollo/client',
  }
}
