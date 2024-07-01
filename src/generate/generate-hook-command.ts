import { green, grey, red, yellow } from 'chalk'
import { CliExpectedError, command, input } from 'clifer'
import pluralize from 'pluralize'
import { toNonNullArray } from 'tsds-tools'
import ts from 'typescript'
import { config } from '../config'
import { Diagnostic } from '../diagnostic'
import { generateHookWithErrors } from '../generator'
import { SchemaManager } from '../gql'
import { toString } from '../util'
import { processTypeScriptFiles } from './process-typescript-files'

interface Props {
  file?: string
  pattern?: string
  schema: string
  ignore?: string
}

const schemaManager = new SchemaManager()

function defaultGlobPattern() {
  const defaultPattern = toNonNullArray([...config.reactHook.fileExtensions].flat())
  if (!defaultPattern.length) return undefined
  if (defaultPattern.length === 1) return `**/*${defaultPattern[0]}`
  return `**/*{${defaultPattern.join(',')}}`
}

const spacer = new Array(6).fill('').join(' ')

function showError(error: Diagnostic, sourceFile: ts.SourceFile) {
  console.log(spacer + green(error.code))
  const sourceCode = sourceFile.getFullText().split('\n')
  const show = sourceCode.slice(Math.max(0, error.range.start.line - 2), error.range.end.line + 3)
  console.log(
    show
      .map((l, i) => {
        const lineNumber = i + error.range.start.line - 1
        return toString(
          spacer,
          grey(lineNumber),
          grey(': '),
          lineNumber > error.range.start.line && lineNumber <= error.range.end.line + 1
            ? yellow(l)
            : grey(l),
          lineNumber - 1 === error.range.start.line ? toString(spacer, red(error.message)) : '',
        )
      })
      .join('\n'),
  )
  console.log('')
}

async function run(props: Props) {
  const schemaFile = props.schema ?? schemaManager.findSchemaFiles([process.cwd()], config)?.[0]
  if (!schemaFile) {
    throw new CliExpectedError(
      'No schema file was found in this project. Provide "--schema" as an option to continue',
    )
  }
  await schemaManager.loadSchemaFromFile(schemaFile)
  const schema = schemaManager.getSchema()
  if (!schema) {
    throw new CliExpectedError('Invalid schema file. Provide "--schema" as an option to continue')
  }
  console.log(grey('Using schema file: ') + yellow(schemaFile) + '\n')
  await processTypeScriptFiles(
    { ...props, defaultPattern: defaultGlobPattern() },
    async (sourceFile: ts.SourceFile) => {
      const { sourceFile: updatedSourcefile, errors } = await generateHookWithErrors(
        sourceFile,
        schema,
        config,
      )
      if (!!errors.length) {
        errors.map(error => showError(error, sourceFile))
        throw new Error(`Found ${errors.length} ${pluralize('error', errors.length ?? 0)}!`)
      }
      return updatedSourcefile
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
