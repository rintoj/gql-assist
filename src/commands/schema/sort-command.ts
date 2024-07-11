import { command, input } from 'clifer'
import { readFile, writeFile } from 'fs-extra'
import { sortSchema } from '../../schema-sort/schema-sort'
import highlight from 'cli-highlight'

interface Props {
  schema: string
  write?: boolean
  output?: string
}

async function run({ schema, write, output }: Props) {
  const schemaSDL = await readFile(schema, 'utf-8')
  const sorted = sortSchema(schemaSDL)
  if (write) {
    await writeFile(schema, sorted, 'utf-8')
  } else if (output) {
    await writeFile(output, sorted, 'utf-8')
  } else {
    console.log(highlight(sorted))
  }
}

export default command<Props>('sort')
  .description('Sort a GraphQL schema lexicographically by type and field names')
  .option(input('schema').description('Path to the GraphQL schema file').string())
  .option(input('write').description('Overwrite the original schema file with the sorted schema'))
  .option(input('output').description('Path to the output file for the sorted schema').string())
  .handle(run)
