import ts from 'typescript'

export function getMethodDeclaration(node: ts.ClassDeclaration, name: string) {
  return node.members.find(
    member =>
      ts.isMethodDeclaration(member) && ts.isIdentifier(member.name) && member.name.text === name,
  )
}
