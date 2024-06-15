import { command, input } from 'clifer'
import { reduceAsync, toNonNullArray } from 'tsds-tools'
import ts from 'typescript'
import { GQLAssistConfig, config } from '../config'
import { generateEnum } from '../generator/enum/enum-generator'
import { generateInput } from '../generator/input/input-generator'
import { generateModel } from '../generator/model/model-generator'
import { generateResolver } from '../generator/resolver/resolver-generator'
import { processTypeScriptFiles } from './process-typescript-files'

interface GenerateProps {
  file?: string
  pattern?: string
  ignore?: string
}

const plugins = [generateModel, generateInput, generateResolver, generateEnum]

export async function generate(sourceFile: ts.SourceFile, config: GQLAssistConfig) {
  return await reduceAsync(
    plugins,
    (sourceFile, runPlugin) => runPlugin(sourceFile, config),
    sourceFile,
  )
}

function defaultGlobPattern() {
  const defaultPattern = toNonNullArray(
    [
      ...config.enum.fileExtensions,
      ...config.input.fileExtensions,
      ...config.resolver.fileExtensions,
      ...config.response.fileExtensions,
      ...config.model.fileExtensions,
    ].flat(),
  )
  if (!defaultPattern.length) return undefined
  if (defaultPattern.length === 1) return `**/*${defaultPattern[0]}`
  return `**/*{${defaultPattern.join(',')}}`
}

async function run(props: GenerateProps) {
  await processTypeScriptFiles(
    { ...props, defaultPattern: defaultGlobPattern() },
    async (sourceFile: ts.SourceFile) => {
      return await generate(sourceFile, config)
    },
  )
}

export default command<GenerateProps>('decorator')
  .description(
    'Automatically converts TypeScript classes, resolvers, methods, and enums to their respective NestJS GraphQL or Type GraphQL counterparts with appropriate decorators.',
  )
  .option(input('file').description('The source file to inspect and generate').string())
  .option(input('pattern').description('Pattern to identify the files to process').string())
  .option(
    input('ignore').description('Folders to ignore').string().default('node_modules,lib,build'),
  )
  .handle(run)
