import { describe, expect, it } from "vitest"
import { Effect } from "effect"
import type { OpenAPIV3_1 } from "openapi-types"
import { generateHttpApiEndpoint, generateHttpApiGroup, generateFullHttpApi } from "./endpoint-generator.js"
import type { ParsedOpenAPISpec } from "./types.js"

describe("Endpoint Generator", () => {
  describe("generateHttpApiEndpoint", () => {
    it("should generate HttpApiEndpoint for GET operation", async () => {
      const operation: OpenAPIV3_1.OperationObject = {
        summary: "Get user by ID",
        operationId: "getUserById",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "integer"
            }
          }
        ],
        responses: {
          "200": {
            description: "User found",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/User"
                }
              }
            }
          },
          "404": {
            description: "User not found"
          }
        }
      }

      const result = await Effect.runPromise(generateHttpApiEndpoint("/users/{id}", "get", operation))

      expect(result).toContain("export const getUserById = HttpApiEndpoint.get('getUserById', '/users/{id}')")
      expect(result).toContain("id: Schema.Number")
      expect(result).toContain("HttpApiSchema.content('application/json', User)")
    })

    it("should generate HttpApiEndpoint for POST operation with request body", async () => {
      const operation: OpenAPIV3_1.OperationObject = {
        summary: "Create user",
        operationId: "createUser",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: {
                    type: "string"
                  },
                  email: {
                    type: "string"
                  }
                },
                required: ["name", "email"]
              }
            }
          }
        },
        responses: {
          "201": {
            description: "User created",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/User"
                }
              }
            }
          }
        }
      }

      const result = await Effect.runPromise(generateHttpApiEndpoint("/users", "post", operation))

      expect(result).toContain("export const createUser = HttpApiEndpoint.post('createUser', '/users')")
      expect(result).toContain("HttpApiSchema.content('application/json', Schema.Struct({")
      expect(result).toContain("name: Schema.String")
      expect(result).toContain("email: Schema.String")
    })

    it("should generate HttpApiEndpoint with query parameters", async () => {
      const operation: OpenAPIV3_1.OperationObject = {
        summary: "List users",
        operationId: "listUsers",
        parameters: [
          {
            name: "page",
            in: "query",
            schema: {
              type: "integer",
              default: 1
            }
          },
          {
            name: "limit",
            in: "query",
            schema: {
              type: "integer",
              default: 10
            }
          },
          {
            name: "search",
            in: "query",
            schema: {
              type: "string"
            }
          }
        ],
        responses: {
          "200": {
            description: "Users list",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    $ref: "#/components/schemas/User"
                  }
                }
              }
            }
          }
        }
      }

      const result = await Effect.runPromise(generateHttpApiEndpoint("/users", "get", operation))

      expect(result).toContain("export const listUsers = HttpApiEndpoint.get('listUsers', '/users')")
      expect(result).toContain("page: Schema.optional(Schema.Number)")
      expect(result).toContain("limit: Schema.optional(Schema.Number)")
      expect(result).toContain("search: Schema.optional(Schema.String)")
    })
  })

  describe("generateHttpApiGroup", () => {
    it("should generate HttpApiGroup from OpenAPI paths", async () => {
      const spec: ParsedOpenAPISpec = {
        openapi: "3.1.0",
        info: {
          title: "User API",
          version: "1.0.0"
        },
        paths: {
          "/users": {
            get: {
              summary: "List users",
              operationId: "listUsers",
              responses: {
                "200": {
                  description: "Users list"
                }
              }
            },
            post: {
              summary: "Create user",
              operationId: "createUser",
              responses: {
                "201": {
                  description: "User created"
                }
              }
            }
          },
          "/users/{id}": {
            get: {
              summary: "Get user",
              operationId: "getUserById",
              parameters: [
                {
                  name: "id",
                  in: "path",
                  required: true,
                  schema: {
                    type: "integer"
                  }
                }
              ],
              responses: {
                "200": {
                  description: "User found"
                }
              }
            }
          }
        }
      }

      const result = await Effect.runPromise(generateHttpApiGroup(spec))

      expect(result).toContain('import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "@effect/platform"')
      expect(result).toContain("export const userApiGroup = HttpApiGroup.make('UserApi')")
      expect(result).toContain("listUsers")
      expect(result).toContain("createUser")
      expect(result).toContain("getUserById")
    })
  })

  describe("generateFullHttpApi", () => {
    it("should generate complete HttpApi with all endpoints", async () => {
      const spec: ParsedOpenAPISpec = {
        openapi: "3.1.0",
        info: {
          title: "Pet Store API",
          version: "1.0.0"
        },
        paths: {
          "/pets": {
            get: {
              summary: "List pets",
              operationId: "listPets",
              responses: {
                "200": {
                  description: "Pets list"
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
                  type: "integer"
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

      const result = await Effect.runPromise(generateFullHttpApi(spec))

      expect(result).toContain('import { HttpApi } from "@effect/platform"')
      expect(result).toContain("export const petStoreApi = HttpApi.make('PetStoreApi')")
      expect(result).toContain("addGroup(petStoreApiGroup)")
    })

    it("should handle OpenAPI spec without components", async () => {
      const spec: ParsedOpenAPISpec = {
        openapi: "3.1.0",
        info: {
          title: "Simple API",
          version: "1.0.0"
        },
        paths: {
          "/health": {
            get: {
              summary: "Health check",
              operationId: "healthCheck",
              responses: {
                "200": {
                  description: "OK"
                }
              }
            }
          }
        }
      }

      const result = await Effect.runPromise(generateFullHttpApi(spec))

      expect(result).toContain("export const simpleApi = HttpApi.make('SimpleApi')")
      expect(result).toContain("simpleApiGroup")
    })
  })
})