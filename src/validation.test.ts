import { describe, expect, it } from "vitest"
import { Effect, Schema } from "effect"
import type { OpenAPIV3_1 } from "openapi-types"
import {
  validateRequest,
  validateResponse,
  createRequestValidator,
  createResponseValidator
} from "./validation.js"

describe("Request/Response Validation", () => {
  describe("validateRequest", () => {
    it("should validate request with path parameters", async () => {
      const pathSchema = Schema.Struct({
        id: Schema.Number,
        name: Schema.String
      })

      const mockRequest = {
        params: { id: 123, name: "test" },
        query: {},
        body: undefined
      } as any

      const result = await Effect.runPromise(
        validateRequest(mockRequest, { path: pathSchema })
      )

      expect(result.pathParams).toEqual({ id: 123, name: "test" })
    })

    it("should validate request with query parameters", async () => {
      const querySchema = Schema.Struct({
        page: Schema.optional(Schema.Number),
        limit: Schema.optional(Schema.Number),
        search: Schema.optional(Schema.String)
      })

      const mockRequest = {
        params: {},
        query: { page: "1", limit: "10", search: "test" },
        body: undefined
      } as any

      const result = await Effect.runPromise(
        validateRequest(mockRequest, { query: querySchema })
      )

      expect(result.queryParams).toEqual({ page: 1, limit: 10, search: "test" })
    })

    it("should validate request with JSON body", async () => {
      const bodySchema = Schema.Struct({
        name: Schema.String,
        email: Schema.String,
        age: Schema.optional(Schema.Number)
      })

      const mockRequest = {
        params: {},
        query: {},
        body: { name: "John Doe", email: "john@example.com", age: 30 }
      } as any

      const result = await Effect.runPromise(
        validateRequest(mockRequest, { body: bodySchema })
      )

      expect(result.body).toEqual({ name: "John Doe", email: "john@example.com", age: 30 })
    })

    it("should validate complex request with all parameter types", async () => {
      const pathSchema = Schema.Struct({
        userId: Schema.Number
      })

      const querySchema = Schema.Struct({
        include: Schema.optional(Schema.String),
        format: Schema.optional(Schema.Literal("json", "xml"))
      })

      const bodySchema = Schema.Struct({
        settings: Schema.Struct({
          theme: Schema.String,
          notifications: Schema.Boolean
        })
      })

      const mockRequest = {
        params: { userId: 456 },
        query: { include: "profile", format: "json" },
        body: {
          settings: {
            theme: "dark",
            notifications: true
          }
        }
      } as any

      const result = await Effect.runPromise(
        validateRequest(mockRequest, {
          path: pathSchema,
          query: querySchema,
          body: bodySchema
        })
      )

      expect(result.pathParams).toEqual({ userId: 456 })
      expect(result.queryParams).toEqual({ include: "profile", format: "json" })
      expect(result.body).toEqual({
        settings: {
          theme: "dark",
          notifications: true
        }
      })
    })

    it("should fail validation with invalid path parameters", async () => {
      const pathSchema = Schema.Struct({
        id: Schema.Number
      })

      const mockRequest = {
        params: { id: "invalid" },
        query: {},
        body: undefined
      } as any

      const result = Effect.runPromise(
        validateRequest(mockRequest, { path: pathSchema })
      )

      await expect(result).rejects.toThrow()
    })

    it("should fail validation with missing required body fields", async () => {
      const bodySchema = Schema.Struct({
        name: Schema.String,
        email: Schema.String
      })

      const mockRequest = {
        params: {},
        query: {},
        body: { name: "John" } // missing email
      } as any

      const result = Effect.runPromise(
        validateRequest(mockRequest, { body: bodySchema })
      )

      await expect(result).rejects.toThrow()
    })

    it("should handle array parameters in query", async () => {
      const querySchema = Schema.Struct({
        tags: Schema.optional(Schema.Array(Schema.String))
      })

      const mockRequest = {
        params: {},
        query: { tags: ["tag1", "tag2", "tag3"] },
        body: undefined
      } as any

      const result = await Effect.runPromise(
        validateRequest(mockRequest, { query: querySchema })
      )

      expect(result.queryParams).toEqual({ tags: ["tag1", "tag2", "tag3"] })
    })
  })

  describe("validateResponse", () => {
    it("should validate successful response", async () => {
      const responseSchema = Schema.Struct({
        id: Schema.Number,
        name: Schema.String,
        email: Schema.String
      })

      const mockResponse = {
        status: 200,
        body: {
          id: 123,
          name: "John Doe",
          email: "john@example.com"
        }
      } as any

      const result = await Effect.runPromise(
        validateResponse(mockResponse, { 200: responseSchema })
      )

      expect(result.body).toEqual({
        id: 123,
        name: "John Doe",
        email: "john@example.com"
      })
    })

    it("should validate array response", async () => {
      const responseSchema = Schema.Array(Schema.Struct({
        id: Schema.Number,
        title: Schema.String
      }))

      const mockResponse = {
        status: 200,
        body: [
          { id: 1, title: "First Post" },
          { id: 2, title: "Second Post" }
        ]
      } as any

      const result = await Effect.runPromise(
        validateResponse(mockResponse, { 200: responseSchema })
      )

      expect(result.body).toEqual([
        { id: 1, title: "First Post" },
        { id: 2, title: "Second Post" }
      ])
    })

    it("should validate error response", async () => {
      const errorSchema = Schema.Struct({
        error: Schema.String,
        code: Schema.Number
      })

      const mockResponse = {
        status: 404,
        body: {
          error: "Not Found",
          code: 404
        }
      } as any

      const result = await Effect.runPromise(
        validateResponse(mockResponse, { 404: errorSchema })
      )

      expect(result.body).toEqual({
        error: "Not Found",
        code: 404
      })
    })

    it("should fail validation with invalid response structure", async () => {
      const responseSchema = Schema.Struct({
        id: Schema.Number,
        name: Schema.String
      })

      const mockResponse = {
        status: 200,
        body: {
          id: "invalid", // should be number
          name: "John"
        }
      } as any

      const result = Effect.runPromise(
        validateResponse(mockResponse, { 200: responseSchema })
      )

      await expect(result).rejects.toThrow()
    })

    it("should handle unsupported response status", async () => {
      const responseSchema = Schema.Struct({
        message: Schema.String
      })

      const mockResponse = {
        status: 500, // not defined in schemas
        body: { message: "Internal Server Error" }
      } as any

      const result = Effect.runPromise(
        validateResponse(mockResponse, { 200: responseSchema })
      )

      await expect(result).rejects.toThrow()
    })
  })

  describe("createRequestValidator", () => {
    it("should create validator from OpenAPI operation", async () => {
      const operation: OpenAPIV3_1.OperationObject = {
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" }
          },
          {
            name: "format",
            in: "query",
            schema: { type: "string", enum: ["json", "xml"] }
          }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  active: { type: "boolean" }
                },
                required: ["name"]
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Success"
          }
        }
      }

      const validator = await Effect.runPromise(createRequestValidator(operation))

      const mockRequest = {
        params: { id: 123 },
        query: { format: "json" },
        body: { name: "Test", active: true }
      } as any

      const result = await Effect.runPromise(validator(mockRequest))

      expect(result.pathParams).toEqual({ id: 123 })
      expect(result.queryParams).toEqual({ format: "json" })
      expect(result.body).toEqual({ name: "Test", active: true })
    })

    it("should create validator handling optional parameters", async () => {
      const operation: OpenAPIV3_1.OperationObject = {
        parameters: [
          {
            name: "page",
            in: "query",
            schema: { type: "integer", default: 1 }
          },
          {
            name: "search",
            in: "query",
            schema: { type: "string" }
          }
        ],
        responses: {
          "200": {
            description: "Success"
          }
        }
      }

      const validator = await Effect.runPromise(createRequestValidator(operation))

      const mockRequest = {
        params: {},
        query: { search: "test" }, // page is optional
        body: undefined
      } as any

      const result = await Effect.runPromise(validator(mockRequest))

      expect(result.queryParams).toEqual({ search: "test" })
    })
  })

  describe("createResponseValidator", () => {
    it("should create validator from OpenAPI responses", async () => {
      const responses: OpenAPIV3_1.ResponsesObject = {
        "200": {
          description: "User data",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  id: { type: "integer" },
                  username: { type: "string" }
                },
                required: ["id", "username"]
              }
            }
          }
        },
        "404": {
          description: "User not found",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  error: { type: "string" }
                }
              }
            }
          }
        }
      }

      const validator = await Effect.runPromise(createResponseValidator(responses))

      const mockResponse = {
        status: 200,
        body: { id: 42, username: "testuser" }
      } as any

      const result = await Effect.runPromise(validator(mockResponse))

      expect(result.body).toEqual({ id: 42, username: "testuser" })
    })

    it("should validate different response status codes", async () => {
      const responses: OpenAPIV3_1.ResponsesObject = {
        "200": {
          description: "Success",
          content: {
            "application/json": {
              schema: { type: "object", properties: { success: { type: "boolean" } } }
            }
          }
        },
        "400": {
          description: "Bad Request",
          content: {
            "application/json": {
              schema: { type: "object", properties: { error: { type: "string" } } }
            }
          }
        }
      }

      const validator = await Effect.runPromise(createResponseValidator(responses))

      // Test 200 response
      const successResponse = { status: 200, body: { success: true } } as any
      const successResult = await Effect.runPromise(validator(successResponse))
      expect(successResult.body).toEqual({ success: true })

      // Test 400 response
      const errorResponse = { status: 400, body: { error: "Invalid input" } } as any
      const errorResult = await Effect.runPromise(validator(errorResponse))
      expect(errorResult.body).toEqual({ error: "Invalid input" })
    })
  })
})