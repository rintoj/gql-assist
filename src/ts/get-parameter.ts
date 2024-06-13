import ts from 'typescript'
import { getName } from './get-name'

export function hasParameter(node: ts.Node, name: string) {
  return !!getParameterByName(node, name)
}

export function getParameterByName(node: ts.Node, name: string) {
  const parameters = getParameters(node)
  return parameters.find(parameter => getName(parameter) === name)
}

export function getParameters(node: ts.Node) {
  if (ts.isPropertyDeclaration(node) && node.type && ts.isFunctionTypeNode(node.type)) {
    return node.type.parameters
  } else if (ts.isMethodDeclaration(node)) {
    return node.parameters
  }
  return []
}

export function getAllParameters(node: ts.Node) {
  let params: ts.ParameterDeclaration[] = []
  ts.visitEachChild(
    node,
    node => {
      params = params.concat(getParameters(node))
      return node
    },
    undefined,
  )
  return params.flatMap(node => node)
}
