import * as gql from 'graphql'

export const defaultScalarTypes = ['String', 'Int', 'Float', 'Boolean']

export function toJSType(type: gql.GraphQLNamedOutputType | gql.GraphQLNamedInputType) {
  if (gql.isScalarType(type)) {
    switch (type.name) {
      case 'String':
        return 'string'
      case 'Int':
        return 'number'
      case 'Float':
        return 'number'
      case 'Boolean':
        return 'boolean'
    }
  }
  return type?.name
}
