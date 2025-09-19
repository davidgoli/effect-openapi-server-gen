import { Effect } from "effect"
import type { OpenAPIV3_1 } from "openapi-types"
import type { ParsedOpenAPISpec } from "./types.js"
import { generateSchemaCode } from "./schema-utils.js"
import { createEndpointGenerationError } from "./error-utils.js"
import { toPascalCase, toCamelCase } from "./string-utils.js"

export type EndpointGenerationError = ReturnType<typeof createEndpointGenerationError>

const generateParametersSchema = (parameters: (OpenAPIV3_1.ParameterObject | OpenAPIV3_1.ReferenceObject)[]): { path: string; query: string } => {
  const pathParams: string[] = []
  const queryParams: string[] = []

  parameters.forEach(param => {
    if ("$ref" in param) return // Skip refs for now

    const typedParam = param
    const schema = typedParam.schema
    if (!schema) return // Skip parameters without schema

    const schemaCode = generateSchemaCode(schema, { forEndpoint: true })
    const isOptional = !typedParam.required

    if (typedParam.in === "path") {
      pathParams.push(`  ${typedParam.name}: ${schemaCode}`)
    } else if (typedParam.in === "query") {
      const finalCode = isOptional ? generateSchemaCode(schema, { forEndpoint: true, isOptional: true }) : schemaCode
      queryParams.push(`  ${typedParam.name}: ${finalCode}`)
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

  const schemaCode = generateSchemaCode(schema, { forEndpoint: true })
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

  const schemaCode = generateSchemaCode(schema, { forEndpoint: true })
  return `HttpApiSchema.content('application/json', ${schemaCode})`
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