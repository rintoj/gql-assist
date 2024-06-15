import { CliExpectedError, command, input } from 'clifer'
import { toNonNullArray } from 'tsds-tools'
import ts from 'typescript'
import { config } from '../config'
import { generateHook } from '../generator'
import { loadSchema, resolveSchemaFile } from '../generator/hook/graphql-util'
import { processTypeScriptFiles } from './process-typescript-files'

interface Props {
  file?: string
  pattern?: string
  schema: string
  ignore?: string
}

function defaultGlobPattern() {
  const defaultPattern = toNonNullArray([...config.reactHook.fileExtensions].flat())
  if (!defaultPattern.length) return undefined
  if (defaultPattern.length === 1) return `**/*${defaultPattern[0]}`
  return `**/*{${defaultPattern.join(',')}}`
}

async function run(props: Props) {
  const schemaFile = resolveSchemaFile(props.schema, [process.cwd()], config, props.ignore)
  if (!schemaFile) {
    throw new CliExpectedError(
      'No schema file was found in this project. Provide "--schema" as an option to continue',
    )
  }
  console.log('Using schema file: ' + schemaFile)
  const schema = loadSchema(schemaFile)
  await processTypeScriptFiles(
    { ...props, defaultPattern: defaultGlobPattern() },
    async (sourceFile: ts.SourceFile) => {
      return await generateHook(sourceFile, schema, config)
    },
  )
}

export default command<Props>('hook')
  .description(
    'GraphQL Assist converts GraphQL queries into TypeScript code compatible with @apollo/client or similar library, making query writing for Apollo Client easier and less error-prone.',
  )
  .option(input('schema').description('Schema file').string())
  .option(input('file').description('The source file to inspect and generate').string())
  .option(input('pattern').description('Pattern to identify the files to process').string())
  .option(
    input('ignore').description('Folders to ignore').string().default('node_modules,lib,build'),
  )
  .handle(run)
