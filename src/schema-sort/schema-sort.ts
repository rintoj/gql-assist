import { buildSchema, lexicographicSortSchema, printSchema } from 'graphql'

export function sortSchema(schemaSDL: string) {
  const schema = buildSchema(schemaSDL)
  const sortedSchema = lexicographicSortSchema(schema)
  return printSchema(sortedSchema)
}
