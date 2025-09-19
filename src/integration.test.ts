import { describe, expect, it } from "vitest"
import { Effect } from "effect"
import type { OpenAPIV3_1 } from "openapi-types"
import { parseOpenAPI } from "./parser.js"
import { generateSchemasFromComponents } from "./schema-generator.js"
import { generateHttpApiEndpoint, generateHttpApiGroup, generateFullHttpApi } from "./endpoint-generator.js"
import { createRequestValidator, createResponseValidator } from "./validation.js"

const petStoreSpec: OpenAPIV3_1.Document = {
  openapi: "3.1.0",
  info: {
    title: "Pet Store API",
    version: "1.0.0",
    description: "A comprehensive pet store API showcasing OpenAPI 3.1 features"
  },
  servers: [
    {
      url: "https://api.petstore.example.com/v1",
      description: "Production server"
    }
  ],
  paths: {
    "/pets": {
      get: {
        operationId: "listPets",
        summary: "List all pets",
        tags: ["pets"],
        parameters: [
          {
            name: "limit",
            in: "query",
            description: "Maximum number of pets to return",
            schema: {
              type: "integer",
              minimum: 1,
              maximum: 100,
              default: 20
            }
          },
          {
            name: "offset",
            in: "query",
            description: "Number of pets to skip",
            schema: {
              type: "integer",
              minimum: 0,
              default: 0
            }
          },
          {
            name: "tags",
            in: "query",
            description: "Filter by tags",
            style: "form",
            explode: false,
            schema: {
              type: "array",
              items: {
                type: "string"
              }
            }
          }
        ],
        responses: {
          "200": {
            description: "A list of pets",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: {
                        $ref: "#/components/schemas/Pet"
                      }
                    },
                    meta: {
                      $ref: "#/components/schemas/PaginationMeta"
                    }
                  },
                  required: ["data"]
                }
              }
            }
          },
          "400": {
            description: "Bad request",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error"
                }
              }
            }
          }
        }
      },
      post: {
        operationId: "createPet",
        summary: "Create a new pet",
        tags: ["pets"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/CreatePetRequest"
              }
            }
          }
        },
        responses: {
          "201": {
            description: "Pet created successfully",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Pet"
                }
              }
            }
          },
          "400": {
            description: "Invalid input",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error"
                }
              }
            }
          }
        }
      }
    },
    "/pets/{petId}": {
      get: {
        operationId: "getPetById",
        summary: "Get pet by ID",
        tags: ["pets"],
        parameters: [
          {
            name: "petId",
            in: "path",
            required: true,
            description: "ID of the pet to retrieve",
            schema: {
              type: "integer",
              minimum: 1
            }
          }
        ],
        responses: {
          "200": {
            description: "Pet found",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Pet"
                }
              }
            }
          },
          "404": {
            description: "Pet not found",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error"
                }
              }
            }
          }
        }
      },
      put: {
        operationId: "updatePet",
        summary: "Update an existing pet",
        tags: ["pets"],
        parameters: [
          {
            name: "petId",
            in: "path",
            required: true,
            schema: {
              type: "integer",
              minimum: 1
            }
          }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/UpdatePetRequest"
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Pet updated successfully",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Pet"
                }
              }
            }
          },
          "404": {
            description: "Pet not found",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error"
                }
              }
            }
          }
        }
      },
      delete: {
        operationId: "deletePet",
        summary: "Delete a pet",
        tags: ["pets"],
        parameters: [
          {
            name: "petId",
            in: "path",
            required: true,
            schema: {
              type: "integer",
              minimum: 1
            }
          }
        ],
        responses: {
          "204": {
            description: "Pet deleted successfully"
          },
          "404": {
            description: "Pet not found",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error"
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
        required: ["id", "name", "status"],
        properties: {
          id: {
            type: "integer",
            minimum: 1,
            description: "Unique identifier for the pet"
          },
          name: {
            type: "string",
            minLength: 1,
            maxLength: 100,
            description: "Pet's name"
          },
          category: {
            type: "object",
            properties: {
              id: {
                type: "integer"
              },
              name: {
                type: "string"
              }
            }
          },
          tags: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: {
                  type: "integer"
                },
                name: {
                  type: "string"
                }
              }
            }
          },
          status: {
            type: "string",
            enum: ["available", "pending", "sold"],
            description: "Pet's status in the store"
          },
          photoUrls: {
            type: "array",
            items: {
              type: "string",
              format: "uri"
            }
          }
        }
      },
      CreatePetRequest: {
        type: "object",
        required: ["name", "status"],
        properties: {
          name: {
            type: "string",
            minLength: 1,
            maxLength: 100
          },
          category: {
            type: "object",
            properties: {
              id: {
                type: "integer"
              },
              name: {
                type: "string"
              }
            }
          },
          tags: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: {
                  type: "integer"
                },
                name: {
                  type: "string"
                }
              }
            }
          },
          status: {
            type: "string",
            enum: ["available", "pending", "sold"]
          },
          photoUrls: {
            type: "array",
            items: {
              type: "string",
              format: "uri"
            }
          }
        }
      },
      UpdatePetRequest: {
        type: "object",
        properties: {
          name: {
            type: "string",
            minLength: 1,
            maxLength: 100
          },
          category: {
            type: "object",
            properties: {
              id: {
                type: "integer"
              },
              name: {
                type: "string"
              }
            }
          },
          tags: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: {
                  type: "integer"
                },
                name: {
                  type: "string"
                }
              }
            }
          },
          status: {
            type: "string",
            enum: ["available", "pending", "sold"]
          },
          photoUrls: {
            type: "array",
            items: {
              type: "string",
              format: "uri"
            }
          }
        }
      },
      PaginationMeta: {
        type: "object",
        required: ["total", "offset", "limit"],
        properties: {
          total: {
            type: "integer",
            minimum: 0,
            description: "Total number of items"
          },
          offset: {
            type: "integer",
            minimum: 0,
            description: "Number of items skipped"
          },
          limit: {
            type: "integer",
            minimum: 1,
            description: "Maximum number of items returned"
          }
        }
      },
      Error: {
        type: "object",
        required: ["code", "message"],
        properties: {
          code: {
            type: "integer",
            description: "Error code"
          },
          message: {
            type: "string",
            description: "Error message"
          },
          details: {
            type: "object",
            description: "Additional error details"
          }
        }
      }
    }
  }
}

describe("Integration Tests - Pet Store API", () => {
  describe("Complete OpenAPI processing flow", () => {
    it("should parse complex OpenAPI 3.1 specification", async () => {
      const result = await Effect.runPromise(parseOpenAPI(petStoreSpec))

      expect(result.openapi).toBe("3.1.0")
      expect(result.info.title).toBe("Pet Store API")
      expect(Object.keys(result.paths)).toHaveLength(2)
      expect(result.paths["/pets"]).toBeDefined()
      expect(result.paths["/pets/{petId}"]).toBeDefined()
    })

    it("should generate schemas from complex components", async () => {
      const result = await Effect.runPromise(
        generateSchemasFromComponents(petStoreSpec.components)
      )

      expect(result).toContain('import { Schema } from "@effect/schema"')
      expect(result).toContain("export const Pet = Schema.Struct({")
      expect(result).toContain("export const CreatePetRequest = Schema.Struct({")
      expect(result).toContain("export const PaginationMeta = Schema.Struct({")
      expect(result).toContain("export const Error = Schema.Struct({")

      // Check enum handling
      expect(result).toContain('status: Schema.Literal("available", "pending", "sold")')

      // Check nested object handling
      expect(result).toContain("category: Schema.optional(Schema.Struct({")

      // Check array handling
      expect(result).toContain("tags: Schema.optional(Schema.Array(")
    })

    it("should generate HttpApi endpoints for all operations", async () => {
      const endpoints = []

      // Test GET /pets
      const listPetsEndpoint = await Effect.runPromise(
        generateHttpApiEndpoint("/pets", "get", petStoreSpec.paths?.["/pets"]?.get!)
      )
      endpoints.push(listPetsEndpoint)

      // Test POST /pets
      const createPetEndpoint = await Effect.runPromise(
        generateHttpApiEndpoint("/pets", "post", petStoreSpec.paths?.["/pets"]?.post!)
      )
      endpoints.push(createPetEndpoint)

      // Test GET /pets/{petId}
      const getPetEndpoint = await Effect.runPromise(
        generateHttpApiEndpoint("/pets/{petId}", "get", petStoreSpec.paths?.["/pets/{petId}"]?.get!)
      )
      endpoints.push(getPetEndpoint)

      // Test PUT /pets/{petId}
      const updatePetEndpoint = await Effect.runPromise(
        generateHttpApiEndpoint("/pets/{petId}", "put", petStoreSpec.paths?.["/pets/{petId}"]?.put!)
      )
      endpoints.push(updatePetEndpoint)

      // Test DELETE /pets/{petId}
      const deletePetEndpoint = await Effect.runPromise(
        generateHttpApiEndpoint("/pets/{petId}", "delete", petStoreSpec.paths?.["/pets/{petId}"]?.delete!)
      )
      endpoints.push(deletePetEndpoint)

      // Verify all endpoints were generated
      expect(endpoints).toHaveLength(5)

      // Check specific endpoint characteristics
      expect(listPetsEndpoint).toContain("export const listPets = HttpApiEndpoint.get('listPets', '/pets')")
      expect(createPetEndpoint).toContain("export const createPet = HttpApiEndpoint.post('createPet', '/pets')")
      expect(getPetEndpoint).toContain("export const getPetById = HttpApiEndpoint.get('getPetById', '/pets/{petId}')")
      expect(updatePetEndpoint).toContain("export const updatePet = HttpApiEndpoint.put('updatePet', '/pets/{petId}')")
      expect(deletePetEndpoint).toContain("export const deletePet = HttpApiEndpoint.delete('deletePet', '/pets/{petId}')")

      // Check parameter handling
      expect(listPetsEndpoint).toContain("limit: Schema.optional(Schema.Number)")
      expect(listPetsEndpoint).toContain("offset: Schema.optional(Schema.Number)")
      expect(getPetEndpoint).toContain("petId: Schema.Number")
    })

    it("should generate complete HttpApi group", async () => {
      const spec = await Effect.runPromise(parseOpenAPI(petStoreSpec))
      const result = await Effect.runPromise(generateHttpApiGroup(spec))

      expect(result).toContain('import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "@effect/platform"')
      expect(result).toContain("export const petStoreApiGroup = HttpApiGroup.make('PetStoreApi')")
      expect(result).toContain("listPets")
      expect(result).toContain("createPet")
      expect(result).toContain("getPetById")
      expect(result).toContain("updatePet")
      expect(result).toContain("deletePet")
    })

    it("should generate complete HttpApi", async () => {
      const spec = await Effect.runPromise(parseOpenAPI(petStoreSpec))
      const result = await Effect.runPromise(generateFullHttpApi(spec))

      expect(result).toContain('import { HttpApi } from "@effect/platform"')
      expect(result).toContain("export const petStoreApi = HttpApi.make('PetStoreApi')")
      expect(result).toContain("addGroup(petStoreApiGroup)")
    })

    it("should create request validators for complex operations", async () => {
      const createPetOperation = petStoreSpec.paths?.["/pets"]?.post!
      const listPetsOperation = petStoreSpec.paths?.["/pets"]?.get!
      const getPetOperation = petStoreSpec.paths?.["/pets/{petId}"]?.get!

      const createPetValidator = await Effect.runPromise(createRequestValidator(createPetOperation))
      const listPetsValidator = await Effect.runPromise(createRequestValidator(listPetsOperation))
      const getPetValidator = await Effect.runPromise(createRequestValidator(getPetOperation))

      // Test POST /pets validation (with body)
      const createRequest = {
        params: {},
        query: {},
        body: {
          name: "Fluffy",
          status: "available",
          tags: [{ id: 1, name: "friendly" }]
        }
      }

      const createResult = await Effect.runPromise(createPetValidator(createRequest))
      expect(createResult.body).toEqual(createRequest.body)

      // Test GET /pets validation (with query params)
      const listRequest = {
        params: {},
        query: { limit: 10, offset: 0, tags: ["friendly", "cute"] },
        body: undefined
      }

      const listResult = await Effect.runPromise(listPetsValidator(listRequest))
      expect(listResult.queryParams).toEqual({ limit: 10, offset: 0, tags: ["friendly", "cute"] })

      // Test GET /pets/{petId} validation (with path params)
      const getRequest = {
        params: { petId: 123 },
        query: {},
        body: undefined
      }

      const getResult = await Effect.runPromise(getPetValidator(getRequest))
      expect(getResult.pathParams).toEqual({ petId: 123 })
    })

    it("should create response validators for different status codes", async () => {
      const listPetsOperation = petStoreSpec.paths?.["/pets"]?.get!
      const getPetOperation = petStoreSpec.paths?.["/pets/{petId}"]?.get!

      const listPetsValidator = await Effect.runPromise(createResponseValidator(listPetsOperation.responses))
      const getPetValidator = await Effect.runPromise(createResponseValidator(getPetOperation.responses))

      // Test successful list response
      const listResponse = {
        status: 200,
        body: {
          data: [
            {
              id: 1,
              name: "Fluffy",
              status: "available"
            }
          ],
          meta: {
            total: 1,
            offset: 0,
            limit: 20
          }
        }
      }

      const listResult = await Effect.runPromise(listPetsValidator(listResponse))
      expect(listResult.status).toBe(200)
      expect(listResult.body).toEqual(listResponse.body)

      // Test error response
      const errorResponse = {
        status: 400,
        body: {
          code: 400,
          message: "Invalid query parameters"
        }
      }

      const errorResult = await Effect.runPromise(listPetsValidator(errorResponse))
      expect(errorResult.status).toBe(400)
      expect(errorResult.body).toEqual(errorResponse.body)

      // Test single pet response
      const petResponse = {
        status: 200,
        body: {
          id: 1,
          name: "Fluffy",
          status: "available",
          tags: [{ id: 1, name: "friendly" }]
        }
      }

      const petResult = await Effect.runPromise(getPetValidator(petResponse))
      expect(petResult.body).toEqual(petResponse.body)
    })
  })

  describe("OpenAPI 3.1 specific features", () => {
    it("should handle enum schemas correctly", async () => {
      const enumSchema = {
        type: "string" as const,
        enum: ["available", "pending", "sold"]
      }

      const spec = await Effect.runPromise(parseOpenAPI({
        openapi: "3.1.0",
        info: { title: "Test", version: "1.0.0" },
        paths: {
          "/test": {
            post: {
              requestBody: {
                content: {
                  "application/json": {
                    schema: enumSchema
                  }
                }
              },
              responses: {
                "200": { description: "OK" }
              }
            }
          }
        }
      }))

      const operation = spec.paths["/test"]?.post
      expect(operation).toBeDefined()

      const validator = await Effect.runPromise(createRequestValidator(operation!))

      const validRequest = {
        params: {},
        query: {},
        body: "available"
      }

      const result = await Effect.runPromise(validator(validRequest))
      expect(result.body).toBe("available")
    })

    it("should handle nested object schemas", async () => {
      const nestedSchema = {
        type: "object" as const,
        properties: {
          pet: {
            type: "object" as const,
            properties: {
              id: { type: "integer" as const },
              category: {
                type: "object" as const,
                properties: {
                  id: { type: "integer" as const },
                  name: { type: "string" as const }
                }
              }
            },
            required: ["id"]
          }
        },
        required: ["pet"]
      }

      const spec = await Effect.runPromise(parseOpenAPI({
        openapi: "3.1.0",
        info: { title: "Test", version: "1.0.0" },
        paths: {
          "/test": {
            post: {
              requestBody: {
                content: {
                  "application/json": {
                    schema: nestedSchema
                  }
                }
              },
              responses: {
                "200": { description: "OK" }
              }
            }
          }
        }
      }))

      const operation = spec.paths["/test"]?.post
      const validator = await Effect.runPromise(createRequestValidator(operation!))

      const validRequest = {
        params: {},
        query: {},
        body: {
          pet: {
            id: 123,
            category: {
              id: 1,
              name: "Dogs"
            }
          }
        }
      }

      const result = await Effect.runPromise(validator(validRequest))
      expect(result.body).toEqual(validRequest.body)
    })

    it("should handle array schemas with complex items", async () => {
      const arraySchema = {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            id: { type: "integer" as const },
            name: { type: "string" as const },
            tags: {
              type: "array" as const,
              items: { type: "string" as const }
            }
          },
          required: ["id", "name"]
        }
      }

      const spec = await Effect.runPromise(parseOpenAPI({
        openapi: "3.1.0",
        info: { title: "Test", version: "1.0.0" },
        paths: {
          "/test": {
            post: {
              requestBody: {
                content: {
                  "application/json": {
                    schema: arraySchema
                  }
                }
              },
              responses: {
                "200": { description: "OK" }
              }
            }
          }
        }
      }))

      const operation = spec.paths["/test"]?.post
      const validator = await Effect.runPromise(createRequestValidator(operation!))

      const validRequest = {
        params: {},
        query: {},
        body: [
          {
            id: 1,
            name: "Item 1",
            tags: ["tag1", "tag2"]
          },
          {
            id: 2,
            name: "Item 2"
          }
        ]
      }

      const result = await Effect.runPromise(validator(validRequest))
      expect(result.body).toEqual(validRequest.body)
    })
  })
})