import { Effect } from "effect"
import type { OpenAPIV3_1 } from "openapi-types"
import type { ParsedOpenAPISpec } from "./types.js"

export interface EndpointGenerationError {
  readonly _tag: "EndpointGenerationError"
  readonly message: string
  readonly cause?: unknown
}

const generateSchemaCode = (schema: OpenAPIV3_1.SchemaObject | OpenAPIV3_1.ReferenceObject): string => {
  if ("$ref" in schema) {
    const refName = schema.$ref.split("/").pop()
    return refName || "Schema.Unknown"
  }

  const typedSchema = schema

  if (typedSchema.enum) {
    const enumValues = typedSchema.enum.map(value => `"${value}"`).join(", ")
    return `Schema.Literal(${enumValues})`
  }

  switch (typedSchema.type) {
    case "string":
      return "Schema.String"
    case "integer":
    case "number":
      return "Schema.Number"
    case "boolean":
      return "Schema.Boolean"
    case "array":
      if (typedSchema.items) {
        const itemsCode = generateSchemaCode(typedSchema.items)
        return `Schema.Array(${itemsCode})`
      }
      return "Schema.Array(Schema.Unknown)"
    case "object":
      if (typedSchema.properties) {
        const properties = Object.entries(typedSchema.properties).map(([key, propSchema]) => {
          const isRequired = typedSchema.required?.includes(key) ?? false
          const propCode = generateSchemaCode(propSchema)
          return `  ${key}: ${isRequired ? propCode : `Schema.optional(${propCode})`}`
        }).join(",\n")
        return `Schema.Struct({\n${properties}\n})`
      }
      return "Schema.Record({ key: Schema.String, value: Schema.Unknown })"
    default:
      return "Schema.Unknown"
  }
}

const generateParametersSchema = (parameters: (OpenAPIV3_1.ParameterObject | OpenAPIV3_1.ReferenceObject)[]): { path: string; query: string } => {
  const pathParams: string[] = []
  const queryParams: string[] = []

  parameters.forEach(param => {
    if ("$ref" in param) return // Skip refs for now

    const typedParam = param
    const schema = typedParam.schema
    if (!schema) return // Skip parameters without schema

    const schemaCode = generateSchemaCode(schema)
    const isOptional = !typedParam.required

    if (typedParam.in === "path") {
      pathParams.push(`  ${typedParam.name}: ${schemaCode}`)
    } else if (typedParam.in === "query") {
      queryParams.push(`  ${typedParam.name}: ${isOptional ? `Schema.optional(${schemaCode})` : schemaCode}`)
    }
  })

  const pathSchema = pathParams.length > 0 ? `Schema.Struct({\n${pathParams.join(",\n")}\n})` : ""
  const querySchema = queryParams.length > 0 ? `Schema.Struct({\n${queryParams.join(",\n")}\n})` : ""

  return { path: pathSchema, query: querySchema }
}

const generateResponseSchema = (responses: OpenAPIV3_1.ResponsesObject): string => {
  const successResponse = responses["200"] || responses["201"]

  if (!successResponse || "$ref" in successResponse) {
    return ""
  }

  const content = successResponse.content
  if (!content || !content["application/json"]) {
    return ""
  }

  const schema = content["application/json"].schema
  if (!schema) {
    return ""
  }

  const schemaCode = generateSchemaCode(schema)
  return `HttpApiSchema.content('application/json', ${schemaCode})`
}

const generateRequestBodySchema = (requestBody?: OpenAPIV3_1.RequestBodyObject | OpenAPIV3_1.ReferenceObject): string => {
  if (!requestBody || "$ref" in requestBody) {
    return ""
  }

  const content = requestBody.content
  if (!content || !content["application/json"]) {
    return ""
  }

  const schema = content["application/json"].schema
  if (!schema) {
    return ""
  }

  const schemaCode = generateSchemaCode(schema)
  return `HttpApiSchema.content('application/json', ${schemaCode})`
}

const capitalizeFirst = (str: string): string =>
  str.charAt(0).toUpperCase() + str.slice(1)

const toPascalCase = (str: string): string => {
  const cleaned = str.replace(/\s+API$/i, "").replace(/API\s*/gi, "")
  return cleaned.split(/[-_\s]+/).map(capitalizeFirst).join("") + "Api"
}

const toCamelCase = (str: string): string => {
  const cleaned = str.replace(/\s+API$/i, "").replace(/API\s*/gi, "")
  const pascal = cleaned.split(/[-_\s]+/).map(capitalizeFirst).join("")
  return pascal.charAt(0).toLowerCase() + pascal.slice(1)
}

export const generateHttpApiEndpoint = (
  path: string,
  method: string,
  operation: OpenAPIV3_1.OperationObject
): Effect.Effect<string, EndpointGenerationError> =>
  Effect.sync(() => {
    const operationId = operation.operationId || `${method}${path.replace(/[{}]/g, "").replace(/\//g, "_")}`
    const httpMethod = method.toLowerCase()

    let endpointCode = `export const ${operationId} = HttpApiEndpoint.${httpMethod}('${operationId}', '${path}')`

    // Add path parameters
    if (operation.parameters) {
      const { path: pathSchema, query: querySchema } = generateParametersSchema(operation.parameters)

      if (pathSchema) {
        endpointCode += `\n  .addSuccess(HttpApiSchema.content('application/json', ${pathSchema}))`
      }

      if (querySchema) {
        endpointCode += `\n  .addSuccess(HttpApiSchema.content('application/json', ${querySchema}))`
      }
    }

    // Add request body for POST/PUT/PATCH
    if (operation.requestBody && ["post", "put", "patch"].includes(httpMethod)) {
      const requestSchema = generateRequestBodySchema(operation.requestBody)
      if (requestSchema) {
        endpointCode += `\n  .addSuccess(${requestSchema})`
      }
    }

    // Add response schema
    if (operation.responses) {
      const responseSchema = generateResponseSchema(operation.responses)
      if (responseSchema) {
        endpointCode += `\n  .addSuccess(${responseSchema})`
      }
    }

    return endpointCode
  })

export const generateHttpApiGroup = (
  spec: ParsedOpenAPISpec
): Effect.Effect<string, EndpointGenerationError> =>
  Effect.sync(() => {
    const apiName = toPascalCase(spec.info.title)
    const groupName = `${toCamelCase(spec.info.title)}ApiGroup`

    const imports = 'import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "@effect/platform"'

    const endpoints: string[] = []

    Object.entries(spec.paths).forEach(([path, pathItem]) => {
      if (!pathItem) return

      Object.entries(pathItem).forEach(([method, operation]) => {
        if (typeof operation === "object" && operation && "responses" in operation) {
          const operationId = operation.operationId || `${method}${path.replace(/[{}]/g, "").replace(/\//g, "_")}`
          endpoints.push(operationId)
        }
      })
    })

    const groupCode = `export const ${groupName} = HttpApiGroup.make('${apiName}')`
    const endpointsList = endpoints.map(id => `  ${id}`).join(",\n")
    const addEndpoints = endpoints.length > 0 ? `\n  .add([\n${endpointsList}\n  ])` : ""

    return [imports, "", groupCode + addEndpoints].join("\n")
  })

export const generateFullHttpApi = (
  spec: ParsedOpenAPISpec
): Effect.Effect<string, EndpointGenerationError> =>
  Effect.sync(() => {
    const apiName = toPascalCase(spec.info.title)
    const apiVarName = `${toCamelCase(spec.info.title)}Api`
    const groupName = `${toCamelCase(spec.info.title)}ApiGroup`

    const imports = 'import { HttpApi } from "@effect/platform"'
    const apiCode = `export const ${apiVarName} = HttpApi.make('${apiName}')\n  .addGroup(${groupName})`

    return [imports, "", apiCode].join("\n")
  })