import ts from 'typescript'

export function getPropertyDeclaration(node: ts.ClassDeclaration, name: string) {
  return node.members.find(
    member =>
      ts.isPropertyDeclaration(member) && ts.isIdentifier(member.name) && member.name.text === name,
  )
}
