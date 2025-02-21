import * as ts from 'typescript'

export function isEnumType(node: ts.PropertyDeclaration | ts.MethodDeclaration): boolean {
  if (!node.type) {
    return false
  }

  if (ts.isArrayTypeNode(node.type)) {
    const elementType = node.type.elementType
    if (ts.isTypeReferenceNode(elementType)) {
      const typeName = elementType.typeName.getText()
      let isEnumFound = false
      ts.forEachChild(node.getSourceFile(), child => {
        if (ts.isEnumDeclaration(child) && child.name.getText() === typeName) {
          isEnumFound = true
        }
      })
      return isEnumFound
    }
  } else if (ts.isTypeReferenceNode(node.type)) {
    const typeName = node.type.typeName.getText()
    let isEnumFound = false
    ts.forEachChild(node.getSourceFile(), child => {
      if (ts.isEnumDeclaration(child) && child.name.getText() === typeName) {
        isEnumFound = true
      }
    })
    return isEnumFound
  }

  return false
}
