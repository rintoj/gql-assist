import { resolve } from 'path'
import * as fs from 'fs-extra'

export type ServerLibrary = '@nestjs/graphql' | 'type-graphql'
export type NumericType = 'Int' | 'Float'

export interface GQLAssistConfig {
  behaviour: {
    nullableByDefault: boolean
    defaultNumberType: NumericType
    serverLibrary: ServerLibrary
  }
  model: {
    enable: boolean
    fileExtensions: string[]
  }
  resolver: {
    enable: boolean
    fileExtensions: string[]
  }
  input: {
    enable: boolean
    fileExtensions: string[]
  }
  response: {
    enable: boolean
    fileExtensions: string[]
  }
  enum: {
    enable: boolean
    fileExtensions: string[]
  }
  scalar: {
    enable: boolean
    fileExtensions: string[]
  }
  reactHook: {
    enable: boolean
    library: string
    schema?: string
    schemaFileNames: string[]
    fileExtensions: string[]
  }
}

const DEFAULT_CONFIG: GQLAssistConfig = {
  behaviour: {
    nullableByDefault: true,
    defaultNumberType: 'Int',
    serverLibrary: '@nestjs/graphql',
  },
  model: { enable: true, fileExtensions: ['.model.ts'] },
  resolver: { enable: true, fileExtensions: ['.resolver.ts'] },
  input: { enable: true, fileExtensions: ['.input.ts'] },
  response: { enable: true, fileExtensions: ['.response.ts'] },
  scalar: { enable: true, fileExtensions: ['.scalar.ts'] },
  enum: { enable: true, fileExtensions: ['.enum.ts', '.model.ts', '.input.ts', '.response.ts'] },
  reactHook: {
    enable: true,
    fileExtensions: ['.gql.ts'],
    schemaFileNames: ['schema.gql', 'schema.graphql'],
    library: '@apollo/client',
  },
}

const configNames = ['.gql-assist', '.gql-assist.json', 'gql-assist.json']

export function getConfig(): GQLAssistConfig {
  let index = 0
  let configFileName = configNames[index]
  while (configFileName) {
    try {
      const file = resolve(process.cwd(), configFileName)
      if (fs.existsSync(file)) {
        return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(file, 'utf8')) }
      }
    } catch (e) {
      console.error(e)
      // do nothing
    }
    configFileName = configNames[++index]
  }
  try {
    const packageJSON = JSON.parse(fs.readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'))
    return { ...DEFAULT_CONFIG, ...packageJSON['gql-assist'] }
  } catch (e) {
    // do nothing
  }
  return DEFAULT_CONFIG
}

export const config = getConfig()
