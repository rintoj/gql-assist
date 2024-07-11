import chalk from 'chalk'
import { CliExpectedError, command, input } from 'clifer'
import { readFile } from 'fs-extra'
import { GraphQLError } from 'graphql'
import {
  provideSymbolsForSchema,
  SymbolInformation,
  SymbolType,
} from '../../definition-provider/symbol-provider-for-schema'
import { Range } from '../../position/range'

interface Props {
  schema: string
  query: string
  type?: SymbolType
}

function getAt(schema: string, range: Range | null, includeLineNumbers: boolean, query: string) {
  if (!range) return
  const lines = schema.split('\n').slice(range.start.line, range.end.line + 1)
  if (!includeLineNumbers) return lines.join('\n')
  return lines
    .map((line, index) =>
      [
        chalk.gray(`${range.start.line + index}`.padStart(6, ' ')),
        chalk.gray(':'),
        ' ',
        line.replace(query, chalk.yellow(query)),
      ].join(''),
    )
    .join('\n')
}

function toOutput(
  items: SymbolInformation[],
  schemaSDL: string,
  query: string,
  type: SymbolType | undefined,
) {
  return items
    .flatMap(item =>
      item.name.includes(query) && (!type || item.type === type)
        ? getAt(schemaSDL, item.range, true, query)
        : item.children
            .map(child =>
              child.name.includes(query) && (!type || child.type === type) ? child : undefined,
            )
            .filter(Boolean)
            .map(child =>
              child
                ? [
                    getAt(schemaSDL, new Range(item.range.start, item.range.start), true, query),
                    chalk.gray('....'.padStart(7, ' ')),
                    getAt(schemaSDL, child.range, true, query),
                    chalk.gray('....'.padStart(7, ' ')),
                    getAt(schemaSDL, new Range(item.range.end, item.range.end), true, query),
                  ].join('\n')
                : undefined,
            ),
    )
    .filter(Boolean)
    .join(`\n\n${chalk.gray('---')}\n\n`)
}

async function run({ schema, query, type }: Props) {
  try {
    const schemaSDL = await readFile(schema, 'utf-8')
    const symbols = provideSymbolsForSchema(schemaSDL)
    if (!symbols.length) return
    const output = toOutput(symbols, schemaSDL, query, type)
    console.log('')
    console.log(output)
    console.log('')
  } catch (e) {
    if (e instanceof GraphQLError && e.message.startsWith('Syntax Error:')) {
      throw new CliExpectedError(`Invalid schema: "${schema}"`)
    } else if (e.message.startsWith('ENOENT: no such file or directory')) {
      throw new CliExpectedError(`No such file: "${schema}"`)
    }
    throw e
  }
}

export default command<Props>('find')
  .description('Find a type from schema')
  .argument(input('query').description('Search query').string().required())
  .option(input('schema').description('Graphql schema').string().required())
  .option(
    input('type')
      .description('Symbol Type')
      .string()
      .choices(['Scalar', 'Type', 'Enum', 'Input', 'Field', 'Union', 'Interface', 'EnumMember']),
  )
  .handle(run)
