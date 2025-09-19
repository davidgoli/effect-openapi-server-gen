import type { OpenAPIV3_1 } from "openapi-types"

export interface ParsedOpenAPISpec {
  readonly openapi: string
  readonly info: OpenAPIV3_1.InfoObject
  readonly paths: OpenAPIV3_1.PathsObject
  readonly components?: OpenAPIV3_1.ComponentsObject | undefined
  readonly servers?: OpenAPIV3_1.ServerObject[] | undefined
  readonly webhooks?: Record<string, OpenAPIV3_1.PathItemObject | OpenAPIV3_1.ReferenceObject> | undefined
}

export interface GeneratedCode {
  readonly schemas: string
  readonly endpoints: string
  readonly handlers: string
  readonly server: string
}

export interface GenerationOptions {
  readonly name: string
  readonly outputDir: string
  readonly includeHandlers: boolean
  readonly includeServer: boolean
}