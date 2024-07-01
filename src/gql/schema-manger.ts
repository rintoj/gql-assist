import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader'
import { loadSchema } from '@graphql-tools/load'
import { UrlLoader } from '@graphql-tools/url-loader'
import { existsSync } from 'fs-extra'
import * as gql from 'graphql'
import { resolve } from 'path'
import { toNonNullArray } from 'tsds-tools'
import { GQLAssistConfig } from '../config'

export class SchemaManager {
  private schemaFiles: string[] = []
  private path: string | undefined
  private schema: gql.GraphQLSchema | undefined

  getSchemaFSPath() {
    return this.path
  }

  getSchema() {
    return this.schema
  }

  getSchemaFiles() {
    return this.schemaFiles
  }

  findSchemaFiles(folders: string[], config: GQLAssistConfig) {
    const possibleFileNames = toNonNullArray([...config.reactHook.schemaFileNames].flat())
    return (this.schemaFiles = folders
      .flatMap(folder => possibleFileNames.map(fileName => resolve(folder, fileName)))
      .filter(path => existsSync(path)))
  }

  async loadSchemaFromUrl(url: string) {
    this.schema = await loadSchema(url, { loaders: [new UrlLoader()] })
    this.path = url
    return this
  }

  async loadSchemaFromFile(path: string) {
    this.schema = await loadSchema(path, { loaders: [new GraphQLFileLoader()] })
    this.path = path
    return this
  }

  async loadSchema(pathOrUrl: string | undefined) {
    if (pathOrUrl?.startsWith('http')) {
      await this.loadSchemaFromUrl(pathOrUrl)
    } else if (pathOrUrl) {
      await this.loadSchemaFromFile(pathOrUrl)
    }
    return this
  }

  removeSchema() {
    this.schema = undefined
    this.path = undefined
    return this
  }
}
