import { describe, expect, it } from "vitest"
import { Effect } from "effect"
import { generateEffectSchema, generateSchemasFromComponents } from "./schema-generator.js"
import type { OpenAPIV3_1 } from "openapi-types"

describe("Schema Generator", () => {
  describe("generateEffectSchema", () => {
    it("should generate Effect Schema for primitive types", async () => {
      const stringSchema: OpenAPIV3_1.SchemaObject = {
        type: "string"
      }

      const result = await Effect.runPromise(generateEffectSchema(stringSchema, "TestString"))

      expect(result).toContain("export const TestString = Schema.String")
    })

    it("should generate Effect Schema for object types", async () => {
      const objectSchema: OpenAPIV3_1.SchemaObject = {
        type: "object",
        properties: {
          id: {
            type: "integer",
            format: "int64"
          },
          name: {
            type: "string"
          },
          email: {
            type: "string",
            format: "email"
          }
        },
        required: ["id", "name"]
      }

      const result = await Effect.runPromise(generateEffectSchema(objectSchema, "User"))

      expect(result).toContain("export const User = Schema.Struct({")
      expect(result).toContain("id: Schema.Number")
      expect(result).toContain("name: Schema.String")
      expect(result).toContain("email: Schema.optional(Schema.String)")
    })

    it("should generate Effect Schema for array types", async () => {
      const arraySchema: OpenAPIV3_1.SchemaObject = {
        type: "array",
        items: {
          type: "string"
        }
      }

      const result = await Effect.runPromise(generateEffectSchema(arraySchema, "StringArray"))

      expect(result).toContain("export const StringArray = Schema.Array(Schema.String)")
    })

    it("should generate Effect Schema for nested objects", async () => {
      const nestedSchema: OpenAPIV3_1.SchemaObject = {
        type: "object",
        properties: {
          user: {
            type: "object",
            properties: {
              name: {
                type: "string"
              },
              age: {
                type: "integer"
              }
            },
            required: ["name"]
          },
          tags: {
            type: "array",
            items: {
              type: "string"
            }
          }
        },
        required: ["user"]
      }

      const result = await Effect.runPromise(generateEffectSchema(nestedSchema, "NestedObject"))

      expect(result).toContain("export const NestedObject = Schema.Struct({")
      expect(result).toContain("user: Schema.Struct({")
      expect(result).toContain("name: Schema.String")
      expect(result).toContain("age: Schema.optional(Schema.Number)")
      expect(result).toContain("tags: Schema.optional(Schema.Array(Schema.String))")
    })

    it("should handle enum types", async () => {
      const enumSchema: OpenAPIV3_1.SchemaObject = {
        type: "string",
        enum: ["active", "inactive", "pending"]
      }

      const result = await Effect.runPromise(generateEffectSchema(enumSchema, "Status"))

      expect(result).toContain('export const Status = Schema.Literal("active", "inactive", "pending")')
    })
  })

  describe("generateSchemasFromComponents", () => {
    it("should generate multiple schemas from OpenAPI components", async () => {
      const components: OpenAPIV3_1.ComponentsObject = {
        schemas: {
          Pet: {
            type: "object",
            properties: {
              id: {
                type: "integer"
              },
              name: {
                type: "string"
              },
              status: {
                type: "string",
                enum: ["available", "pending", "sold"]
              }
            },
            required: ["id", "name", "status"]
          },
          User: {
            type: "object",
            properties: {
              id: {
                type: "integer"
              },
              username: {
                type: "string"
              },
              email: {
                type: "string",
                format: "email"
              }
            },
            required: ["id", "username"]
          }
        }
      }

      const result = await Effect.runPromise(generateSchemasFromComponents(components))

      expect(result).toContain('import { Schema } from "@effect/schema"')
      expect(result).toContain("export const Pet = Schema.Struct({")
      expect(result).toContain("export const User = Schema.Struct({")
      expect(result).toContain("id: Schema.Number")
      expect(result).toContain("name: Schema.String")
      expect(result).toContain("username: Schema.String")
      expect(result).toContain('status: Schema.Literal("available", "pending", "sold")')
    })

    it("should return empty string when no components provided", async () => {
      const result = await Effect.runPromise(generateSchemasFromComponents())

      expect(result).toBe("")
    })

    it("should return empty string when components has no schemas", async () => {
      const components: OpenAPIV3_1.ComponentsObject = {
        responses: {
          NotFound: {
            description: "Entity not found"
          }
        }
      }

      const result = await Effect.runPromise(generateSchemasFromComponents(components))

      expect(result).toBe("")
    })
  })
})