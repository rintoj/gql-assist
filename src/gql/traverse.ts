import * as gql from 'graphql'
import { Maybe } from 'graphql/jsutils/Maybe'

interface EnterLeaveVisitor<TVisitedNode extends gql.ASTNode> {
  readonly enter?: ASTVisitFn<TVisitedNode>
  readonly leave?: ASTVisitFn<TVisitedNode>
}

declare type KindVisitor = {
  readonly [NodeT in gql.ASTNode as NodeT['kind']]?: ASTVisitFn<NodeT> | EnterLeaveVisitor<NodeT>
}

declare type ASTVisitor = EnterLeaveVisitor<gql.ASTNode> | KindVisitor

export declare type ASTVisitFn<TVisitedNode extends gql.ASTNode> = (
  node: TVisitedNode,
  parent: gql.ObjectTypeDefinitionNode | gql.GraphQLOutputType,
  path: string[],
) => any

export class Path {
  private readonly current: string[] = []

  push(...paths: Array<string | undefined>) {
    for (const path of paths) {
      if (path) this.current.push(path)
    }
    return this
  }

  pop() {
    return this.current.pop()
  }

  get() {
    return this.current
  }
}

export function traverse(
  document: gql.DocumentNode,
  schema: gql.GraphQLSchema,
  visitor: ASTVisitor,
) {
  const path = new Path()
  const parents: Array<Maybe<gql.GraphQLObjectType<any, any>> | gql.GraphQLField<any, any, any>> =
    []
  const { OperationDefinition, Field, leave } = visitor as any

  function parent() {
    return parents[parents.length - 1]
  }

  function fields(): any {
    const current = parent()
    if (gql.isObjectType(current)) {
      return current.getFields()
    } else if (gql.isObjectType(current?.type)) {
      return current?.type?.getFields()
    }
    return []
  }

  return gql.visit(document, {
    // ...Object.keys(visitor)
    //   .filter(i => !['OperationDefinition', 'Field', 'leave'].includes(i))
    //   .reduce((a, key) => {
    //     return {
    //       ...a,
    //       [key]: (node: any) => {
    //         return (visitor as any)[key]?.(node, parent(), path.get())
    //       },
    //     }
    //   }, {}),
    OperationDefinition(node: gql.OperationDefinitionNode) {
      const parent = schema.getRootType(node.operation)
      parents.push(parent)
      path.push(node.operation, node.name?.value)
      return OperationDefinition?.(node, parent, path.get())
    },
    Field(node: gql.FieldNode) {
      if (!!node.selectionSet?.selections?.length) {
        const parent = fields()?.[node.name.value]
        parents.push(parent)
        path.push(node.name.value)
        return Field?.(node, parent, path.get())
      }
      return Field?.(node, parent(), path.get())
    },
    // leave(node) {
    //   if (node.kind === gql.Kind.SELECTION_SET) {
    //     parents.pop()
    //     path.pop()
    //   }
    //   return leave?.(node, parent(), path.get())
    // },
  })
}
