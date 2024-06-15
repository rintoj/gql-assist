import { command, input } from 'clifer'
import { writeFile } from 'fs-extra'
import { reduceAsync } from 'tsds-tools'
import ts from 'typescript'
import { GQLAssistConfig, config } from '../config'
import { generateEnum } from '../generator/enum/enum-generator'
import { generateInput } from '../generator/input/input-generator'
import { generateModel } from '../generator/model/model-generator'
import { generateResolver } from '../generator/resolver/resolver-generator'
import { readTSFile } from '../ts/parse-ts'
import { prettify } from '../ts/prettify'
import { printTS } from '../ts/print-ts'

interface GenerateProps {
  file: string
}

const plugins = [generateModel, generateInput, generateResolver, generateEnum]

export async function generate(sourceFile: ts.SourceFile, config: GQLAssistConfig) {
  return await reduceAsync(
    plugins,
    (sourceFile, runPlugin) => runPlugin(sourceFile, config),
    sourceFile,
  )
}

async function run({ file }: GenerateProps) {
  const sourceFile = readTSFile(file)
  const output = await prettify(printTS(await generate(sourceFile, config), undefined))
  await writeFile(file, output)
}

export default command<GenerateProps>('decorator')
  .description(
    'Automatically converts TypeScript classes, resolvers, methods, and enums to their respective NestJS GraphQL or Type GraphQL counterparts with appropriate decorators.',
  )
  .option(input('file').description('The source file to inspect and generate').string().required())
  .handle(run)
