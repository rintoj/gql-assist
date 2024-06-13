import ts from 'typescript'

export function getParameterType(parameter: ts.ParameterDeclaration) {
  if (
    parameter.type &&
    ts.isTypeReferenceNode(parameter.type) &&
    ts.isIdentifier(parameter.type.typeName) &&
    parameter.type.typeName.text !== ''
  ) {
    return parameter.type.typeName.text
  }
}
