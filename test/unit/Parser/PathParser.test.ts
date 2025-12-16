import { describe, expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import type * as OpenApiParser from "../../../src/Parser/OpenApiParser.js"
import * as PathParser from "../../../src/Parser/PathParser.js"

describe("PathParser", () => {
  describe("extractOperations", () => {
    it("should extract a single GET operation", () =>
      Effect.gen(function*() {
        const spec: OpenApiParser.OpenApiSpec = {
          openapi: "3.1.0",
          info: { title: "Test", version: "1.0.0" },
          paths: {
            "/users": {
              get: {
                operationId: "getUsers",
                responses: { "200": { description: "Success" } }
              }
            }
          }
        }

        const operations = yield* PathParser.extractOperations(spec)

        expect(operations).toHaveLength(1)
        expect(operations[0].operationId).toBe("getUsers")
        expect(operations[0].method).toBe("get")
        expect(operations[0].path).toBe("/users")
      }))

    it("should extract multiple operations from same path", () =>
      Effect.gen(function*() {
        const spec: OpenApiParser.OpenApiSpec = {
          openapi: "3.1.0",
          info: { title: "Test", version: "1.0.0" },
          paths: {
            "/users": {
              get: {
                operationId: "getUsers",
                responses: { "200": { description: "Success" } }
              },
              post: {
                operationId: "createUser",
                responses: { "201": { description: "Created" } }
              }
            }
          }
        }

        const operations = yield* PathParser.extractOperations(spec)

        expect(operations).toHaveLength(2)
        expect(operations.map((op) => op.operationId)).toEqual(["getUsers", "createUser"])
        expect(operations.map((op) => op.method)).toEqual(["get", "post"])
      }))

    it("should extract operations from multiple paths", () =>
      Effect.gen(function*() {
        const spec: OpenApiParser.OpenApiSpec = {
          openapi: "3.1.0",
          info: { title: "Test", version: "1.0.0" },
          paths: {
            "/users": {
              get: {
                operationId: "getUsers",
                responses: { "200": { description: "Success" } }
              }
            },
            "/posts": {
              get: {
                operationId: "getPosts",
                responses: { "200": { description: "Success" } }
              }
            }
          }
        }

        const operations = yield* PathParser.extractOperations(spec)

        expect(operations).toHaveLength(2)
        expect(operations.map((op) => op.path)).toEqual(["/users", "/posts"])
      }))

    it("should extract path parameters", () =>
      Effect.gen(function*() {
        const spec: OpenApiParser.OpenApiSpec = {
          openapi: "3.1.0",
          info: { title: "Test", version: "1.0.0" },
          paths: {
            "/users/{userId}": {
              get: {
                operationId: "getUser",
                parameters: [
                  {
                    name: "userId",
                    in: "path",
                    required: true,
                    schema: { type: "number" }
                  }
                ],
                responses: { "200": { description: "Success" } }
              }
            }
          }
        }

        const operations = yield* PathParser.extractOperations(spec)

        expect(operations[0].pathParameters).toHaveLength(1)
        expect(operations[0].pathParameters[0].name).toBe("userId")
        expect(operations[0].pathParameters[0].schema.type).toBe("number")
      }))

    it("should extract query parameters", () =>
      Effect.gen(function*() {
        const spec: OpenApiParser.OpenApiSpec = {
          openapi: "3.1.0",
          info: { title: "Test", version: "1.0.0" },
          paths: {
            "/users": {
              get: {
                operationId: "getUsers",
                parameters: [
                  {
                    name: "page",
                    in: "query",
                    schema: { type: "number" }
                  },
                  {
                    name: "limit",
                    in: "query",
                    required: true,
                    schema: { type: "number" }
                  }
                ],
                responses: { "200": { description: "Success" } }
              }
            }
          }
        }

        const operations = yield* PathParser.extractOperations(spec)

        expect(operations[0].queryParameters).toHaveLength(2)
        expect(operations[0].queryParameters.map((p) => p.name)).toEqual(["page", "limit"])
      }))

    it("should extract request body schema", () =>
      Effect.gen(function*() {
        const spec: OpenApiParser.OpenApiSpec = {
          openapi: "3.1.0",
          info: { title: "Test", version: "1.0.0" },
          paths: {
            "/users": {
              post: {
                operationId: "createUser",
                requestBody: {
                  required: true,
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          name: { type: "string" }
                        }
                      }
                    }
                  }
                },
                responses: { "201": { description: "Created" } }
              }
            }
          }
        }

        const operations = yield* PathParser.extractOperations(spec)

        expect(operations[0].requestBody).toBeDefined()
        expect(operations[0].requestBody?.schema.type).toBe("object")
        expect(operations[0].requestBody?.required).toBe(true)
      }))

    it("should extract response schema", () =>
      Effect.gen(function*() {
        const spec: OpenApiParser.OpenApiSpec = {
          openapi: "3.1.0",
          info: { title: "Test", version: "1.0.0" },
          paths: {
            "/users": {
              get: {
                operationId: "getUsers",
                responses: {
                  "200": {
                    description: "Success",
                    content: {
                      "application/json": {
                        schema: {
                          type: "array",
                          items: { type: "object" }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }

        const operations = yield* PathParser.extractOperations(spec)

        expect(operations[0].successResponse).toBeDefined()
        expect(operations[0].successResponse?.schema.type).toBe("array")
        expect(operations[0].successResponse?.statusCode).toBe("200")
      }))

    it("should extract tags", () =>
      Effect.gen(function*() {
        const spec: OpenApiParser.OpenApiSpec = {
          openapi: "3.1.0",
          info: { title: "Test", version: "1.0.0" },
          paths: {
            "/users": {
              get: {
                operationId: "getUsers",
                tags: ["users", "public"],
                responses: { "200": { description: "Success" } }
              }
            }
          }
        }

        const operations = yield* PathParser.extractOperations(spec)

        expect(operations[0].tags).toEqual(["users", "public"])
      }))

    it("should handle operation with no parameters", () =>
      Effect.gen(function*() {
        const spec: OpenApiParser.OpenApiSpec = {
          openapi: "3.1.0",
          info: { title: "Test", version: "1.0.0" },
          paths: {
            "/health": {
              get: {
                operationId: "healthCheck",
                responses: { "200": { description: "OK" } }
              }
            }
          }
        }

        const operations = yield* PathParser.extractOperations(spec)

        expect(operations[0].pathParameters).toEqual([])
        expect(operations[0].queryParameters).toEqual([])
        expect(operations[0].requestBody).toBeUndefined()
      }))
  })
})
