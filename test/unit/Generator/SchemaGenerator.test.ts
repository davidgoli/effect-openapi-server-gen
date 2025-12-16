import { describe, expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as SchemaGenerator from "../../../src/Generator/SchemaGenerator.js"
import type * as OpenApiParser from "../../../src/Parser/OpenApiParser.js"

describe("SchemaGenerator", () => {
  describe("generateSchemaCode", () => {
    it("should generate Schema.String for string type", () =>
      Effect.gen(function*() {
        const schema: OpenApiParser.SchemaObject = {
          type: "string"
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toBe("Schema.String")
      }))

    it("should generate Schema.Number for number type", () =>
      Effect.gen(function*() {
        const schema: OpenApiParser.SchemaObject = {
          type: "number"
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toBe("Schema.Number")
      }))

    it("should generate Schema.Number for integer type", () =>
      Effect.gen(function*() {
        const schema: OpenApiParser.SchemaObject = {
          type: "integer"
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toBe("Schema.Number")
      }))

    it("should generate Schema.Boolean for boolean type", () =>
      Effect.gen(function*() {
        const schema: OpenApiParser.SchemaObject = {
          type: "boolean"
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toBe("Schema.Boolean")
      }))

    it("should generate Schema.Struct for object type with properties", () =>
      Effect.gen(function*() {
        const schema: OpenApiParser.SchemaObject = {
          type: "object",
          properties: {
            name: { type: "string" },
            age: { type: "number" }
          },
          required: ["name"]
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toContain("Schema.Struct")
        expect(result).toContain("name: Schema.String")
        expect(result).toContain("age: Schema.optional(Schema.Number)")
      }))

    it("should generate Schema.Array for array type", () =>
      Effect.gen(function*() {
        const schema: OpenApiParser.SchemaObject = {
          type: "array",
          items: { type: "string" }
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toBe("Schema.Array(Schema.String)")
      }))

    it("should fail when array type is missing items", () =>
      Effect.gen(function*() {
        const schema: OpenApiParser.SchemaObject = {
          type: "array"
        }

        const result = yield* Effect.flip(SchemaGenerator.generateSchemaCode(schema))

        expect(result.message).toContain("array")
        expect(result.message).toContain("items")
      }))

    it("should generate Schema.optional for non-required properties", () =>
      Effect.gen(function*() {
        const schema: OpenApiParser.SchemaObject = {
          type: "object",
          properties: {
            optional: { type: "string" }
          }
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toContain("optional: Schema.optional(Schema.String)")
      }))

    it("should handle nested objects", () =>
      Effect.gen(function*() {
        const schema: OpenApiParser.SchemaObject = {
          type: "object",
          properties: {
            user: {
              type: "object",
              properties: {
                name: { type: "string" }
              },
              required: ["name"]
            }
          },
          required: ["user"]
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toContain("Schema.Struct")
        expect(result).toContain("user: Schema.Struct")
        expect(result).toContain("name: Schema.String")
      }))

    it("should handle object with no properties", () =>
      Effect.gen(function*() {
        const schema: OpenApiParser.SchemaObject = {
          type: "object"
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toBe("Schema.Struct({})")
      }))

    it("should add description annotation when present", () =>
      Effect.gen(function*() {
        const schema: OpenApiParser.SchemaObject = {
          type: "string",
          description: "User's name"
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toContain(".annotations")
        expect(result).toContain("description")
        expect(result).toContain("User's name")
      }))

    it("should fail for unsupported type", () =>
      Effect.gen(function*() {
        const schema: OpenApiParser.SchemaObject = {
          type: "unknown" as any
        }

        const result = yield* Effect.flip(SchemaGenerator.generateSchemaCode(schema))

        expect(result.message).toContain("Unsupported")
      }))

    it("should handle $ref by using schema name", () =>
      Effect.gen(function*() {
        const schema: OpenApiParser.SchemaObject = {
          $ref: "#/components/schemas/User"
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toBe("UserSchema")
      }))

    it("should handle $ref in object properties", () =>
      Effect.gen(function*() {
        const schema: OpenApiParser.SchemaObject = {
          type: "object",
          properties: {
            id: { type: "string" },
            author: { $ref: "#/components/schemas/User" }
          },
          required: ["id"]
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toContain("author: UserSchema")
      }))

    it("should handle $ref in array items", () =>
      Effect.gen(function*() {
        const schema: OpenApiParser.SchemaObject = {
          type: "array",
          items: { $ref: "#/components/schemas/User" }
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toBe("Schema.Array(UserSchema)")
      }))

    it("should use Schema.suspend for circular $ref", () =>
      Effect.gen(function*() {
        const schema: OpenApiParser.SchemaObject = {
          type: "object",
          properties: {
            id: { type: "string" },
            friends: {
              type: "array",
              items: { $ref: "#/components/schemas/User" }
            }
          },
          required: ["id"],
          "x-circular": ["friends"]
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toContain("friends: Schema.optional(Schema.Array(Schema.suspend(() => UserSchema)))")
      }))
  })

  describe("generateNamedSchema", () => {
    it("should generate a named schema definition", () =>
      Effect.gen(function*() {
        const name = "User"
        const schema: OpenApiParser.SchemaObject = {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" }
          },
          required: ["id", "name"]
        }

        const result = yield* SchemaGenerator.generateNamedSchema(name, schema)

        expect(result).toContain("const UserSchema = Schema.Struct")
        expect(result).toContain("id: Schema.String")
        expect(result).toContain("name: Schema.String")
      }))

    it("should handle schema with description", () =>
      Effect.gen(function*() {
        const name = "User"
        const schema: OpenApiParser.SchemaObject = {
          type: "object",
          description: "A user entity",
          properties: {
            id: { type: "string" }
          },
          required: ["id"]
        }

        const result = yield* SchemaGenerator.generateNamedSchema(name, schema)

        expect(result).toContain("const UserSchema =")
        expect(result).toContain("description")
        expect(result).toContain("A user entity")
      }))

    it("should handle schemas with $refs", () =>
      Effect.gen(function*() {
        const name = "Post"
        const schema: OpenApiParser.SchemaObject = {
          type: "object",
          properties: {
            id: { type: "string" },
            author: { $ref: "#/components/schemas/User" }
          },
          required: ["id"]
        }

        const result = yield* SchemaGenerator.generateNamedSchema(name, schema)

        expect(result).toContain("const PostSchema = Schema.Struct")
        expect(result).toContain("author: UserSchema")
      }))
  })
})
