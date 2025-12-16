import { describe, expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as fs from "node:fs"
import * as path from "node:path"
import * as ApiGenerator from "../../src/Generator/ApiGenerator.js"
import * as CodeEmitter from "../../src/Generator/CodeEmitter.js"
import * as OpenApiParser from "../../src/Parser/OpenApiParser.js"

const fixturesDir = path.join(__dirname, "fixtures", "phase2")

const readFixture = (filename: string): string => {
  const fixturePath = path.join(fixturesDir, filename)
  return fs.readFileSync(fixturePath, "utf-8")
}

describe("Phase 2 - Schema Components & References", () => {
  describe("refs-external.yaml", () => {
    it("should generate named schema definitions from components/schemas", () =>
      Effect.gen(function*() {
        const specContent = readFixture("refs-external.yaml")
        const spec = yield* OpenApiParser.parse(specContent)
        const apiCode = yield* ApiGenerator.generateApi(spec)

        // Should have schema definitions comment
        expect(apiCode).toContain("// Schema definitions from components/schemas")

        // Should generate UserSchema
        expect(apiCode).toContain("const UserSchema = Schema.Struct")
        expect(apiCode).toContain("id: Schema.String")
        expect(apiCode).toContain("username: Schema.String")
        expect(apiCode).toContain("email: Schema.String")

        // Should generate PostSchema with reference to UserSchema
        expect(apiCode).toContain("const PostSchema = Schema.Struct")
        expect(apiCode).toContain("author: UserSchema")

        // Should generate CommentSchema with references
        expect(apiCode).toContain("const CommentSchema = Schema.Struct")
        expect(apiCode).toContain("author: UserSchema")
        expect(apiCode).toContain("post: Schema.optional(PostSchema)")
      }))

    it("should use named schemas in endpoint definitions", () =>
      Effect.gen(function*() {
        const specContent = readFixture("refs-external.yaml")
        const spec = yield* OpenApiParser.parse(specContent)
        const apiCode = yield* ApiGenerator.generateApi(spec)

        // Endpoints should reference the named schemas
        expect(apiCode).toContain(".addSuccess(Schema.Array(UserSchema))")
        expect(apiCode).toContain(".setPayload(UserSchema)")
        expect(apiCode).toContain(".addSuccess(UserSchema)")
        expect(apiCode).toContain(".addSuccess(Schema.Array(PostSchema))")
      }))

    it("should order code correctly: schemas before endpoints", () =>
      Effect.gen(function*() {
        const specContent = readFixture("refs-external.yaml")
        const spec = yield* OpenApiParser.parse(specContent)
        const apiCode = yield* ApiGenerator.generateApi(spec)

        const schemaIdx = apiCode.indexOf("const UserSchema")
        const endpointIdx = apiCode.indexOf("HttpApiEndpoint.get")

        expect(schemaIdx).toBeGreaterThan(0)
        expect(endpointIdx).toBeGreaterThan(schemaIdx)
      }))
  })

  describe("nested-schemas.yaml", () => {
    it("should handle deeply nested schemas", () =>
      Effect.gen(function*() {
        const specContent = readFixture("nested-schemas.yaml")
        const spec = yield* OpenApiParser.parse(specContent)
        const apiCode = yield* ApiGenerator.generateApi(spec)

        // Should generate all component schemas
        expect(apiCode).toContain("const AddressSchema = Schema.Struct")
        expect(apiCode).toContain("const ContactInfoSchema = Schema.Struct")
        expect(apiCode).toContain("const DepartmentSchema = Schema.Struct")
        expect(apiCode).toContain("const EmployeeSchema = Schema.Struct")

        // Should have nested object properties
        expect(apiCode).toContain("coordinates: Schema.Struct")
        expect(apiCode).toContain("latitude: Schema.Number")
        expect(apiCode).toContain("longitude: Schema.Number")
      }))

    it("should resolve nested $refs correctly", () =>
      Effect.gen(function*() {
        const specContent = readFixture("nested-schemas.yaml")
        const spec = yield* OpenApiParser.parse(specContent)
        const apiCode = yield* ApiGenerator.generateApi(spec)

        // ContactInfo should reference Address
        expect(apiCode).toContain("address: Schema.optional(AddressSchema)")

        // Employee should reference ContactInfo and Department
        expect(apiCode).toContain("contact: Schema.optional(ContactInfoSchema)")
        expect(apiCode).toContain("department: Schema.optional(DepartmentSchema)")
      }))
  })

  describe("arrays-and-optionals.yaml", () => {
    it("should handle optional fields correctly", () =>
      Effect.gen(function*() {
        const specContent = readFixture("arrays-and-optionals.yaml")
        const spec = yield* OpenApiParser.parse(specContent)
        const apiCode = yield* ApiGenerator.generateApi(spec)

        // Optional fields should use Schema.optional
        expect(apiCode).toMatch(/description:\s*Schema\.optional\(Schema\.String\)/)
        expect(apiCode).toMatch(/metadata:\s*Schema\.optional\(Schema\.Struct/)
      }))

    it("should handle array types", () =>
      Effect.gen(function*() {
        const specContent = readFixture("arrays-and-optionals.yaml")
        const spec = yield* OpenApiParser.parse(specContent)
        const apiCode = yield* ApiGenerator.generateApi(spec)

        // Arrays should use Schema.Array
        expect(apiCode).toContain("Schema.Array(Schema.String)")
      }))

    it("should handle arrays in query parameters", () =>
      Effect.gen(function*() {
        const specContent = readFixture("arrays-and-optionals.yaml")
        const spec = yield* OpenApiParser.parse(specContent)
        const apiCode = yield* ApiGenerator.generateApi(spec)

        // Query parameter arrays
        expect(apiCode).toContain("tags: Schema.optional(Schema.Array(Schema.String))")
      }))
  })

  describe("petstore.yaml", () => {
    it("should handle classic petstore example", () =>
      Effect.gen(function*() {
        const specContent = readFixture("petstore.yaml")
        const spec = yield* OpenApiParser.parse(specContent)
        const apiCode = yield* ApiGenerator.generateApi(spec)

        // Should generate all petstore schemas
        expect(apiCode).toContain("const CategorySchema = Schema.Struct")
        expect(apiCode).toContain("const TagSchema = Schema.Struct")
        expect(apiCode).toContain("const PetSchema = Schema.Struct")
        expect(apiCode).toContain("const OrderSchema = Schema.Struct")

        // Pet should reference Category and Tag
        expect(apiCode).toContain("category: Schema.optional(CategorySchema)")
        expect(apiCode).toContain("tags: Schema.optional(Schema.Array(TagSchema))")
      }))

    it("should handle path parameters with $ref responses", () =>
      Effect.gen(function*() {
        const specContent = readFixture("petstore.yaml")
        const spec = yield* OpenApiParser.parse(specContent)
        const apiCode = yield* ApiGenerator.generateApi(spec)

        // Path parameter endpoints
        expect(apiCode).toContain("const petIdParam = HttpApiSchema.param")
        expect(apiCode).toContain("`/pets/${petIdParam}`")
        expect(apiCode).toContain(".addSuccess(PetSchema)")
      }))
  })

  describe("circular-refs.yaml", () => {
    it("should handle circular references without errors", () =>
      Effect.gen(function*() {
        const specContent = readFixture("circular-refs.yaml")
        const spec = yield* OpenApiParser.parse(specContent)

        // Should not throw - circular refs are detected
        const apiCode = yield* ApiGenerator.generateApi(spec)

        // Should generate all schemas
        expect(apiCode).toContain("const UserSchema = Schema.Struct")
        expect(apiCode).toContain("const TreeNodeSchema = Schema.Struct")
        expect(apiCode).toContain("const OrganizationSchema = Schema.Struct")
        expect(apiCode).toContain("const EmployeeSchema = Schema.Struct")
      }))

    it("should preserve circular $refs for later Schema.suspend handling", () =>
      Effect.gen(function*() {
        const specContent = readFixture("circular-refs.yaml")
        const spec = yield* OpenApiParser.parse(specContent)
        const apiCode = yield* ApiGenerator.generateApi(spec)

        // Circular refs should be preserved (not resolved infinitely)
        // They reference the schema name for later handling with Schema.suspend
        expect(apiCode).toContain("friends: Schema.optional(Schema.Array(UserSchema))")
        expect(apiCode).toContain("bestFriend: Schema.optional(UserSchema)")
      }))
  })

  describe("Complete generation pipeline", () => {
    it("should generate complete valid code for all Phase 2 fixtures", () =>
      Effect.gen(function*() {
        const fixtures = [
          "refs-external.yaml",
          "nested-schemas.yaml",
          "arrays-and-optionals.yaml",
          "petstore.yaml",
          "circular-refs.yaml"
        ]

        for (const fixture of fixtures) {
          const specContent = readFixture(fixture)
          const spec = yield* OpenApiParser.parse(specContent)
          const apiCode = yield* ApiGenerator.generateApi(spec)
          const finalCode = yield* CodeEmitter.emit(apiCode)

          // Basic validity checks
          expect(finalCode).toContain("import * as Schema from \"effect/Schema\"")
          expect(finalCode).toContain("export {")
          expect(finalCode.length).toBeGreaterThan(100)
        }
      }))

    it("should maintain proper code structure for all fixtures", () =>
      Effect.gen(function*() {
        const specContent = readFixture("petstore.yaml")
        const spec = yield* OpenApiParser.parse(specContent)
        const apiCode = yield* ApiGenerator.generateApi(spec)

        // Check order: imports -> schemas -> endpoints -> API
        const lines = apiCode.split("\n")
        let inImports = false
        let inSchemas = false
        let inEndpoints = false
        let inApi = false

        for (const line of lines) {
          if (line.startsWith("import ")) inImports = true
          if (line.includes("Schema definitions")) inSchemas = true
          if (line.includes("HttpApiEndpoint")) inEndpoints = true
          if (line.includes("HttpApi.make")) inApi = true

          // Verify order
          if (inSchemas) expect(inImports).toBe(true)
          if (inEndpoints) expect(inSchemas).toBe(true)
          if (inApi) expect(inEndpoints).toBe(true)
        }
      }))
  })
})
