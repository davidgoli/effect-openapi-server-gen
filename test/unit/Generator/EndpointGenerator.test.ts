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

        const code = yield* EndpointGenerator.generateEndpoint(operation)

        expect(code).toContain("HttpApiEndpoint.get(\"getUsers\")")
        expect(code).toContain("\"/users\"")
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

        const code = yield* EndpointGenerator.generateEndpoint(operation)

        expect(code).toContain("HttpApiEndpoint.post(\"createUser\")")
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

        const code = yield* EndpointGenerator.generateEndpoint(operation)

        expect(code).toContain("HttpApiEndpoint.get(\"getUser\")")
        expect(code).toContain("const userIdParam = HttpApiSchema.param")
        expect(code).toContain("(\"userId\", Schema.Number)")
        expect(code).toContain("`/users/${userIdParam}`")
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

        const code = yield* EndpointGenerator.generateEndpoint(operation)

        expect(code).toContain("const userIdParam = HttpApiSchema.param")
        expect(code).toContain("const postIdParam = HttpApiSchema.param")
        expect(code).toContain("`/users/${userIdParam}/posts/${postIdParam}`")
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

        const code = yield* EndpointGenerator.generateEndpoint(operation)

        expect(code).toContain(".setPayload(")
        expect(code).toContain("Schema.Struct")
        expect(code).toContain("name: Schema.String")
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

        const code = yield* EndpointGenerator.generateEndpoint(operation)

        expect(code).toContain(".addSuccess(")
        expect(code).toContain("Schema.Array")
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

        const code = yield* EndpointGenerator.generateEndpoint(operation)

        expect(code).toContain(".setUrlParams(")
        expect(code).toContain("Schema.Struct")
        expect(code).toContain("page: Schema.optional(Schema.Number)")
        expect(code).toContain("limit: Schema.Number")
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

        const code = yield* EndpointGenerator.generateEndpoint(operation)

        expect(code).toContain("HttpApiEndpoint.patch(\"updateUser\")")
        expect(code).toContain("const userIdParam =")
        expect(code).toContain(".setUrlParams(")
        expect(code).toContain(".setPayload(")
        expect(code).toContain(".addSuccess(")
      }))
  })
})
