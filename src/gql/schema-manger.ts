import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader'
import { JsonFileLoader } from '@graphql-tools/json-file-loader'
import { loadSchema } from '@graphql-tools/load'
import { UrlLoader } from '@graphql-tools/url-loader'
import { existsSync } from 'fs-extra'
import * as gql from 'graphql'
import { resolve } from 'path'
import { toNonNullArray } from 'tsds-tools'
import { GQLAssistConfig } from '../config'

export class SchemaManager {
  private schemaFSPath: string | undefined
  private schema: gql.GraphQLSchema | undefined
  private schemaFiles: string[] = []

  async loadSchemaFromUrl(url: string) {
    this.schema = await loadSchema(url, { loaders: [new UrlLoader()] })
    this.schemaFSPath = url
    return this
  }

  async loadSchemaFromFile(pathOrGlobPattern: string) {
    this.schema = await loadSchema(pathOrGlobPattern, { loaders: [new GraphQLFileLoader()] })
    this.schemaFSPath = pathOrGlobPattern
    return this
  }

  async loadSchemaFromJSON(path: string) {
    this.schema = await loadSchema(path, { loaders: [new JsonFileLoader()] })
    this.schemaFSPath = path
    return this
  }

  async loadSchema(path: string) {
    if (path.startsWith('http')) {
      return this.loadSchemaFromUrl(path)
    } else if (path.endsWith('json')) {
      return this.loadSchemaFromJSON(path)
    } else {
      return this.loadSchemaFromFile(path)
    }
  }

  findSchemaFiles(folders: string[], config: GQLAssistConfig) {
    const possibleFileNames = toNonNullArray([...config.reactHook.schema].flat())
    const files = (this.schemaFiles = folders
      .flatMap(folder => possibleFileNames.map(fileName => resolve(folder, fileName)))
      .filter(path => existsSync(path)))
    if (this.schemaFSPath && !files.includes(this.schemaFSPath)) {
      this.schemaFSPath = undefined
      this.schema = undefined
    }
    return files
  }

  async findAndLoadSchemaFile(folders: string[], config: GQLAssistConfig) {
    const files = this.findSchemaFiles(folders, config)
    if (!this.schemaFSPath || !files.includes(this.schemaFSPath)) {
      await this.loadSchemaFromFile(files[0])
    }
    return files
  }

  getSchemaFSPath() {
    return this.schemaFSPath
  }

  getSchemaFiles() {
    return this.schemaFiles
  }

  getSchema() {
    return this.schema
  }
}
