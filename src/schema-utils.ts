import type { OpenAPIV3_1 } from "openapi-types"

export interface SchemaGenerationOptions {
  readonly isOptional?: boolean
  readonly forEndpoint?: boolean
}

export const generateSchemaCode = (
  schema: OpenAPIV3_1.SchemaObject | OpenAPIV3_1.ReferenceObject,
  options: SchemaGenerationOptions = {}
): string => {
  const { isOptional = false, forEndpoint = false } = options

  const wrapOptional = (code: string): string =>
    isOptional ? `Schema.optional(${code})` : code

  if ("$ref" in schema) {
    const refName = schema.$ref.split("/").pop()
    return forEndpoint ? (refName || "Schema.Unknown") : wrapOptional(refName || "Schema.Unknown")
  }

  const typedSchema = schema

  if (typedSchema.enum) {
    const enumValues = typedSchema.enum.map(value => `"${value}"`).join(", ")
    return wrapOptional(`Schema.Literal(${enumValues})`)
  }

  switch (typedSchema.type) {
    case "string":
      return wrapOptional("Schema.String")
    case "integer":
    case "number":
      return wrapOptional("Schema.Number")
    case "boolean":
      return wrapOptional("Schema.Boolean")
    case "array":
      if (typedSchema.items) {
        const itemsCode = generateSchemaCode(typedSchema.items, { ...options, isOptional: false })
        return wrapOptional(`Schema.Array(${itemsCode})`)
      }
      return wrapOptional("Schema.Array(Schema.Unknown)")
    case "object":
      if (typedSchema.properties) {
        const properties = Object.entries(typedSchema.properties).map(([key, propSchema]) => {
          const isRequired = typedSchema.required?.includes(key) ?? false
          const propCode = generateSchemaCode(propSchema, { ...options, isOptional: !isRequired })
          return `  ${key}: ${propCode}`
        }).join(",\n")
        return wrapOptional(`Schema.Struct({\n${properties}\n})`)
      }
      return wrapOptional("Schema.Record({ key: Schema.String, value: Schema.Unknown })")
    default:
      return wrapOptional("Schema.Unknown")
  }
}