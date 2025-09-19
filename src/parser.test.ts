import { describe, expect, it } from "vitest"
import { Effect } from "effect"
import type { OpenAPIV3_1 } from "openapi-types"
import { parseOpenAPI } from "./parser.js"

describe("OpenAPI Parser", () => {
  it("should parse a minimal OpenAPI 3.1 spec from JSON object", async () => {
    const minimalSpec = {
      openapi: "3.1.0",
      info: {
        title: "Test API",
        version: "1.0.0"
      },
      paths: {}
    }

    const result = await Effect.runPromise(parseOpenAPI(minimalSpec))

    expect(result.openapi).toBe("3.1.0")
    expect(result.info.title).toBe("Test API")
    expect(result.info.version).toBe("1.0.0")
    expect(result.paths).toEqual({})
  })

  it("should parse OpenAPI spec with paths and components", async () => {
    const specWithPaths = {
      openapi: "3.1.0",
      info: {
        title: "Pet Store API",
        version: "1.0.0"
      },
      paths: {
        "/pets": {
          get: {
            summary: "List all pets",
            responses: {
              "200": {
                description: "A list of pets",
                content: {
                  "application/json": {
                    schema: {
                      type: "array",
                      items: {
                        "$ref": "#/components/schemas/Pet"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      components: {
        schemas: {
          Pet: {
            type: "object",
            properties: {
              id: {
                type: "integer",
                format: "int64"
              },
              name: {
                type: "string"
              }
            },
            required: ["id", "name"]
          }
        }
      }
    }

    const result = await Effect.runPromise(parseOpenAPI(specWithPaths))

    expect(result.openapi).toBe("3.1.0")
    expect(result.info.title).toBe("Pet Store API")
    expect(result.paths["/pets"]).toBeDefined()
    expect(result.components?.schemas?.Pet).toBeDefined()
    const petSchema = result.components?.schemas?.Pet as OpenAPIV3_1.SchemaObject
    expect((petSchema?.properties?.name as OpenAPIV3_1.SchemaObject)?.type).toBe("string")
  })

  it("should fail gracefully with invalid OpenAPI spec", async () => {
    const invalidSpec = {
      // Missing required 'openapi' field
      info: {
        title: "Invalid API",
        version: "1.0.0"
      }
    }

    await expect(Effect.runPromise(parseOpenAPI(invalidSpec))).rejects.toThrow()
  })

  it("should parse OpenAPI spec from JSON string", async () => {
    const jsonString = JSON.stringify({
      openapi: "3.1.0",
      info: {
        title: "String Test API",
        version: "1.0.0"
      },
      paths: {}
    })

    const result = await Effect.runPromise(parseOpenAPI(jsonString))

    expect(result.openapi).toBe("3.1.0")
    expect(result.info.title).toBe("String Test API")
  })
})