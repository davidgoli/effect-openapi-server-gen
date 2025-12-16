import { describe, expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as EndpointGenerator from "../../../src/Generator/EndpointGenerator.js"
import type * as PathParser from "../../../src/Parser/PathParser.js"

describe("EndpointGenerator", () => {
  describe("generateEndpoint", () => {
    it("should generate a simple GET endpoint", () =>
      Effect.gen(function*() {
        const operation: PathParser.ParsedOperation = {
          operationId: "getUsers",
          method: "get",
          path: "/users",
          tags: [],
          pathParameters: [],
          queryParameters: [],
          headerParameters: []
        }

        const result = yield* EndpointGenerator.generateEndpoint(operation)

        expect(result.pathParamDeclarations).toHaveLength(0)
        expect(result.endpointCode).toContain("HttpApiEndpoint.get(\"getUsers\")")
        expect(result.endpointCode).toContain("\"/users\"")
      }))

    it("should generate POST endpoint", () =>
      Effect.gen(function*() {
        const operation: PathParser.ParsedOperation = {
          operationId: "createUser",
          method: "post",
          path: "/users",
          tags: [],
          pathParameters: [],
          queryParameters: [],
          headerParameters: []
        }

        const result = yield* EndpointGenerator.generateEndpoint(operation)

        expect(result.endpointCode).toContain("HttpApiEndpoint.post(\"createUser\")")
      }))

    it("should generate endpoint with path parameter using template syntax", () =>
      Effect.gen(function*() {
        const operation: PathParser.ParsedOperation = {
          operationId: "getUser",
          method: "get",
          path: "/users/{userId}",
          tags: [],
          pathParameters: [
            {
              name: "userId",
              in: "path",
              required: true,
              schema: { type: "number" }
            }
          ],
          queryParameters: [],
          headerParameters: []
        }

        const result = yield* EndpointGenerator.generateEndpoint(operation)

        expect(result.pathParamDeclarations).toHaveLength(1)
        expect(result.pathParamDeclarations[0]).toContain("const userIdParam = HttpApiSchema.param")
        expect(result.pathParamDeclarations[0]).toContain("(\"userId\", Schema.Number)")
        expect(result.endpointCode).toContain("HttpApiEndpoint.get(\"getUser\")")
        expect(result.endpointCode).toContain("`/users/${userIdParam}`")
      }))

    it("should generate endpoint with multiple path parameters", () =>
      Effect.gen(function*() {
        const operation: PathParser.ParsedOperation = {
          operationId: "getPost",
          method: "get",
          path: "/users/{userId}/posts/{postId}",
          tags: [],
          pathParameters: [
            {
              name: "userId",
              in: "path",
              required: true,
              schema: { type: "number" }
            },
            {
              name: "postId",
              in: "path",
              required: true,
              schema: { type: "string" }
            }
          ],
          queryParameters: [],
          headerParameters: []
        }

        const result = yield* EndpointGenerator.generateEndpoint(operation)

        expect(result.pathParamDeclarations).toHaveLength(2)
        expect(result.pathParamDeclarations[0]).toContain("const userIdParam = HttpApiSchema.param")
        expect(result.pathParamDeclarations[1]).toContain("const postIdParam = HttpApiSchema.param")
        expect(result.endpointCode).toContain("`/users/${userIdParam}/posts/${postIdParam}`")
      }))

    it("should add setPayload for request body", () =>
      Effect.gen(function*() {
        const operation: PathParser.ParsedOperation = {
          operationId: "createUser",
          method: "post",
          path: "/users",
          tags: [],
          pathParameters: [],
          queryParameters: [],
          headerParameters: [],
          requestBody: {
            schema: {
              type: "object",
              properties: {
                name: { type: "string" }
              },
              required: ["name"]
            },
            required: true
          }
        }

        const result = yield* EndpointGenerator.generateEndpoint(operation)

        expect(result.endpointCode).toContain(".setPayload(")
        expect(result.endpointCode).toContain("Schema.Struct")
        expect(result.endpointCode).toContain("name: Schema.String")
      }))

    it("should add addSuccess for response", () =>
      Effect.gen(function*() {
        const operation: PathParser.ParsedOperation = {
          operationId: "getUsers",
          method: "get",
          path: "/users",
          tags: [],
          pathParameters: [],
          queryParameters: [],
          headerParameters: [],
          successResponse: {
            statusCode: "200",
            schema: {
              type: "array",
              items: { type: "object" }
            }
          }
        }

        const result = yield* EndpointGenerator.generateEndpoint(operation)

        expect(result.endpointCode).toContain(".addSuccess(")
        expect(result.endpointCode).toContain("Schema.Array")
      }))

    it("should add setUrlParams for query parameters", () =>
      Effect.gen(function*() {
        const operation: PathParser.ParsedOperation = {
          operationId: "getUsers",
          method: "get",
          path: "/users",
          tags: [],
          pathParameters: [],
          queryParameters: [
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
          headerParameters: []
        }

        const result = yield* EndpointGenerator.generateEndpoint(operation)

        expect(result.endpointCode).toContain(".setUrlParams(")
        expect(result.endpointCode).toContain("Schema.Struct")
        expect(result.endpointCode).toContain("page: Schema.optional(Schema.Number)")
        expect(result.endpointCode).toContain("limit: Schema.Number")
      }))

    it("should handle endpoint with all features", () =>
      Effect.gen(function*() {
        const operation: PathParser.ParsedOperation = {
          operationId: "updateUser",
          method: "patch",
          path: "/users/{userId}",
          summary: "Update a user",
          tags: ["users"],
          pathParameters: [
            {
              name: "userId",
              in: "path",
              required: true,
              schema: { type: "number" }
            }
          ],
          queryParameters: [
            {
              name: "notify",
              in: "query",
              schema: { type: "boolean" }
            }
          ],
          headerParameters: [],
          requestBody: {
            schema: {
              type: "object",
              properties: {
                name: { type: "string" }
              }
            },
            required: true
          },
          successResponse: {
            statusCode: "200",
            schema: { type: "object" }
          }
        }

        const result = yield* EndpointGenerator.generateEndpoint(operation)

        expect(result.endpointCode).toContain("HttpApiEndpoint.patch(\"updateUser\")")
        expect(result.pathParamDeclarations[0]).toContain("const userIdParam =")
        expect(result.endpointCode).toContain(".setUrlParams(")
        expect(result.endpointCode).toContain(".setPayload(")
        expect(result.endpointCode).toContain(".addSuccess(")
      }))
  })
})
