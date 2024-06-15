import { command, input } from 'clifer'
import { writeFile } from 'fs-extra'
import { config } from '../config'
import { generateHook } from '../generator'
import { loadSchema } from '../generator/hook/graphql-util'
import { prettify, printTS, readTSFile } from '../ts'

interface Props {
  file: string
  schema: string
}

async function run(props: Props) {
  const schema = loadSchema(props.schema)
  const sourceFile = readTSFile(props.file)
  const output = await prettify(printTS(await generateHook(sourceFile, schema, config), undefined))
  await writeFile(props.file, output)
}

export default command<Props>('hook')
  .description(
    'GraphQL Assist converts GraphQL queries into TypeScript code compatible with @apollo/client or similar library, making query writing for Apollo Client easier and less error-prone.',
  )
  .option(input('schema').description('Schema file').string().required())
  .option(input('file').description('The source file to inspect and generate').string().required())
  .handle(run)
