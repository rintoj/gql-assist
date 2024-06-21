export function fixGraphQLString(gqlString: string) {
  return gqlString.replace(/\{[\n\s]*\}/g, '{ __typename }')
}
