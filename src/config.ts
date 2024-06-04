import { resolve } from 'path'
import * as fs from 'fs-extra'

export interface GQLAssistConfig {
  nullableByDefault: boolean
}

const DEFAULT_CONFIG: GQLAssistConfig = {
  nullableByDefault: true,
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
