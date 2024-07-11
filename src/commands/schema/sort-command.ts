import { CliExpectedError, command, input } from 'clifer'
import { readFile, writeFile } from 'fs-extra'
import { GraphQLError } from 'graphql'
import { sortSchema } from '../../schema-sort/schema-sort'

interface Props {
  schema: string
  write?: boolean
  output?: string
}

async function run({ schema, write, output }: Props) {
  try {
    const schemaSDL = await readFile(schema, 'utf-8')
    const sorted = sortSchema(schemaSDL)
    if (write) {
      await writeFile(schema, sorted, 'utf-8')
    } else if (output) {
      await writeFile(output, sorted, 'utf-8')
    } else {
      console.log(sorted)
    }
  } catch (e) {
    if (e instanceof GraphQLError && e.message.startsWith('Syntax Error:')) {
      throw new CliExpectedError(`Invalid schema: "${schema}"`)
    } else if (e.message.startsWith('ENOENT: no such file or directory')) {
      throw new CliExpectedError(`No such file: "${schema}"`)
    } else if (e.message.startsWith('EISDIR: illegal operation on a directory')) {
      throw new CliExpectedError(`Provide a file name, not a directory. You provided "${schema}".`)
    }
    throw e
  }
}

export default command<Props>('sort')
  .description('Sort a GraphQL schema lexicographically by type and field names')
  .option(input('schema').description('Path to the GraphQL schema file').string())
  .option(input('write').description('Overwrite the original schema file with the sorted schema'))
  .option(input('output').description('Path to the output file for the sorted schema').string())
  .handle(run)
