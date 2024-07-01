import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader'
import { loadSchema } from '@graphql-tools/load'
import { UrlLoader } from '@graphql-tools/url-loader'
import EventEmitter from 'events'
import { existsSync } from 'fs-extra'
import * as gql from 'graphql'
import { resolve } from 'path'
import { toNonNullArray } from 'tsds-tools'
import { GQLAssistConfig } from '../config'

enum SchemaEvent {
  LOAD = 'load:Schema',
  CHANGE = 'change:Schema',
  REMOVE = 'remove:Schema',
}

export class SchemaManager {
  private schemaFiles: string[] = []
  private path: string | undefined
  private schema: gql.GraphQLSchema | undefined
  private changeEmitter = new EventEmitter()

  private setSchema(path: string | undefined, schema: gql.GraphQLSchema | undefined) {
    const currentSchema = this.schema
    this.path = path
    this.schema = schema
    if (!currentSchema) {
      this.changeEmitter.emit(SchemaEvent.LOAD)
    } else if (!schema) {
      this.changeEmitter.emit(SchemaEvent.REMOVE)
    } else {
      this.changeEmitter.emit(SchemaEvent.CHANGE)
    }
    return this
  }

  async loadSchemaFromUrl(url: string) {
    return this.setSchema(url, await loadSchema(url, { loaders: [new UrlLoader()] }))
  }

  async loadSchemaFromFile(path: string) {
    return this.setSchema(path, await loadSchema(path, { loaders: [new GraphQLFileLoader()] }))
  }

  async loadSchemaIfValid(path: string | undefined) {
    if (!path) return this
    if (path.startsWith('http')) {
      return this.loadSchemaFromUrl(path)
    }
    if (this.schemaFiles.includes(path)) {
      return this.loadSchemaFromFile(path)
    }
    return this
  }

  onDidLoad(callback: (schema: gql.GraphQLSchema | undefined, path: string | undefined) => any) {
    const handler = () => callback(this.schema, this.path)
    this.changeEmitter.on(SchemaEvent.LOAD, handler)
    return { dispose: () => this.changeEmitter.off(SchemaEvent.LOAD, handler) }
  }

  onDidChange(callback: (schema: gql.GraphQLSchema | undefined, path: string | undefined) => any) {
    const handler = () => callback(this.schema, this.path)
    this.changeEmitter.on(SchemaEvent.CHANGE, handler)
    return { dispose: () => this.changeEmitter.off(SchemaEvent.CHANGE, handler) }
  }

  onDidRemove(callback: (schema: gql.GraphQLSchema | undefined, path: string | undefined) => any) {
    const handler = () => callback(this.schema, this.path)
    this.changeEmitter.on(SchemaEvent.REMOVE, handler)
    return { dispose: () => this.changeEmitter.off(SchemaEvent.REMOVE, handler) }
  }

  findSchemaFiles(folders: string[], config: GQLAssistConfig) {
    const possibleFileNames = toNonNullArray([...config.reactHook.schemaFileNames].flat())
    const files = (this.schemaFiles = folders
      .flatMap(folder => possibleFileNames.map(fileName => resolve(folder, fileName)))
      .filter(path => existsSync(path)))
    if (this.path && !files.includes(this.path)) {
      this.setSchema(undefined, undefined)
    }
    return files
  }

  getSchemaFSPath() {
    return this.path
  }

  getSchemaFiles() {
    return this.schemaFiles
  }

  getSchema() {
    return this.schema
  }
}
