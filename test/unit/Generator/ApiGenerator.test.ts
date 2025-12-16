import { describe, expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as ApiGenerator from "../../../src/Generator/ApiGenerator.js"
import type * as OpenApiParser from "../../../src/Parser/OpenApiParser.js"

describe("ApiGenerator", () => {
  describe("generateApi", () => {
    it("should generate complete API with imports and exports", () =>
      Effect.gen(function*() {
        const spec: OpenApiParser.OpenApiSpec = {
          openapi: "3.1.0",
          info: {
            title: "Sample API",
            version: "1.0.0",
            description: "A sample API"
          },
          paths: {
            "/users": {
              get: {
                operationId: "getUsers",
                tags: ["users"],
                responses: { "200": { description: "Success" } }
              }
            }
          }
        }

        const code = yield* ApiGenerator.generateApi(spec)

        // Should have imports
        expect(code).toContain("import * as HttpApi")
        expect(code).toContain("import * as HttpApiEndpoint")
        expect(code).toContain("import * as HttpApiGroup")
        expect(code).toContain("import * as HttpApiSchema")
        expect(code).toContain("import * as Schema")

        // Should have endpoint definition
        expect(code).toContain("const getUsers")

        // Should have group definition
        expect(code).toContain("const usersGroup")

        // Should have API definition
        expect(code).toContain("HttpApi.make(\"SampleAPI\")")

        // Should export the API
        expect(code).toContain("export { SampleAPI }")
      }))

    it("should generate API name from spec title", () =>
      Effect.gen(function*() {
        const spec: OpenApiParser.OpenApiSpec = {
          openapi: "3.1.0",
          info: {
            title: "My Test API",
            version: "1.0.0"
          },
          paths: {
            "/test": {
              get: {
                operationId: "test",
                responses: { "200": { description: "Success" } }
              }
            }
          }
        }

        const code = yield* ApiGenerator.generateApi(spec)

        expect(code).toContain("HttpApi.make(\"MyTestAPI\")")
        expect(code).toContain("const MyTestAPI =")
      }))

    it("should handle multiple groups", () =>
      Effect.gen(function*() {
        const spec: OpenApiParser.OpenApiSpec = {
          openapi: "3.1.0",
          info: {
            title: "Multi Group API",
            version: "1.0.0"
          },
          paths: {
            "/users": {
              get: {
                operationId: "getUsers",
                tags: ["users"],
                responses: { "200": { description: "Success" } }
              }
            },
            "/posts": {
              get: {
                operationId: "getPosts",
                tags: ["posts"],
                responses: { "200": { description: "Success" } }
              }
            }
          }
        }

        const code = yield* ApiGenerator.generateApi(spec)

        expect(code).toContain("const usersGroup")
        expect(code).toContain("const postsGroup")
        expect(code).toContain(".add(usersGroup)")
        expect(code).toContain(".add(postsGroup)")
      }))

    it("should handle API with description", () =>
      Effect.gen(function*() {
        const spec: OpenApiParser.OpenApiSpec = {
          openapi: "3.1.0",
          info: {
            title: "Test API",
            version: "1.0.0",
            description: "This is a test API"
          },
          paths: {
            "/test": {
              get: {
                operationId: "test",
                responses: { "200": { description: "Success" } }
              }
            }
          }
        }

        const code = yield* ApiGenerator.generateApi(spec)

        // Description should be included as a comment
        expect(code).toContain("This is a test API")
      }))
  })
})
