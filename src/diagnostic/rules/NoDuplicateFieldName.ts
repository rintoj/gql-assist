import * as gql from 'graphql'
import { isFieldNode, isInlineFragmentNode } from '../../gql'

export function NoDuplicateFieldName(document: gql.DocumentNode, schema: gql.GraphQLSchema) {
  const errors: gql.GraphQLError[] = []
  const typeInfo = new gql.TypeInfo(schema)
  gql.visit(
    document,
    gql.visitWithTypeInfo(typeInfo, {
      SelectionSet(node) {
        const parent = typeInfo.getParentType()
        const type = parent?.name
        node.selections.reduce(
          (a, node) => {
            const name = isFieldNode(node)
              ? node.name.value
              : isInlineFragmentNode(node)
                ? node.typeCondition?.name.value
                : undefined
            if (!name) return a
            if (!!a[name]) {
              errors.push(
                new gql.GraphQLError(`Duplicate field "${name}" on type "${type}" `, {
                  nodes: [node],
                }),
              )
            }
            return { ...a, [name]: true }
          },
          {} as Record<string, boolean>,
        )
      },
    }),
  )
  return errors
}
