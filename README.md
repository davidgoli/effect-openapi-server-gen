# effect-openapi-server-gen

Generate [Effect](https://effect.website) HttpApi server code from [OpenAPI](https://spec.openapis.org/oas/v3.1.0) 3.1 specifications.

## Features

- 🚀 **Complete Code Generation**: Generates fully-typed Effect HttpApi server code
- 📊 **Schema Validation**: Effect Schema definitions for request/response validation
- 🔧 **OpenAPI 3.1 Support**: Full support for OpenAPI 3.1 specification features
- 📝 **Multiple Formats**: Supports both YAML and JSON OpenAPI specifications
- 🎯 **Type Safety**: Generated code is fully type-safe with Effect's type system
- ⚡ **CLI Ready**: Command-line interface for easy integration into build pipelines
- 🧪 **Well Tested**: Comprehensive test suite with 44+ tests including integration tests

## Installation

```bash
npm install effect-openapi-server-gen
# or
yarn add effect-openapi-server-gen
# or
pnpm add effect-openapi-server-gen
```

## Quick Start

### CLI Usage

Generate Effect HttpApi code from an OpenAPI specification:

```bash
# From YAML file
npx effect-openapi-server-gen --output ./generated petstore.yaml

# From JSON file
npx effect-openapi-server-gen --output ./api-types petstore.json

# Specify format explicitly
npx effect-openapi-server-gen --format yaml --output ./generated spec.yml
```

### CLI Options

- `<spec>`: Path to OpenAPI specification file (YAML or JSON)
- `--output`: Output directory (default: `./generated`)
- `--format`: Input format - `auto`, `json`, or `yaml` (default: `auto`)

### Generated Code Structure

The CLI generates the following files:

```
generated/
├── schemas.ts      # Effect Schema definitions
├── endpoints.ts    # HttpApiGroup with all endpoints
├── api.ts         # Complete HttpApi
└── index.ts       # Re-exports all modules
```

## Programmatic Usage

You can also use the library programmatically:

```typescript
import { Effect } from "effect"
import {
  parseOpenAPI,
  generateSchemasFromComponents,
  generateHttpApiGroup,
  generateFullHttpApi
} from "effect-openapi-server-gen"

const generateCode = Effect.gen(function* () {
  // Parse OpenAPI spec
  const spec = yield* parseOpenAPI({
    openapi: "3.1.0",
    info: { title: "My API", version: "1.0.0" },
    paths: {
      "/users": {
        get: {
          operationId: "getUsers",
          responses: {
            "200": {
              description: "List of users",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: { $ref: "#/components/schemas/User" }
                  }
                }
              }
            }
          }
        }
      }
    },
    components: {
      schemas: {
        User: {
          type: "object",
          required: ["id", "name"],
          properties: {
            id: { type: "integer" },
            name: { type: "string" }
          }
        }
      }
    }
  })

  // Generate schemas
  const schemas = yield* generateSchemasFromComponents(spec.components)

  // Generate API group
  const apiGroup = yield* generateHttpApiGroup(spec)

  // Generate full API
  const fullApi = yield* generateFullHttpApi(spec)

  return { schemas, apiGroup, fullApi }
})
```

## Example Generated Code

Given this OpenAPI specification:

```yaml
openapi: 3.1.0
info:
  title: Pet Store API
  version: 1.0.0
paths:
  /pets:
    get:
      operationId: listPets
      parameters:
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
      responses:
        '200':
          description: List of pets
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Pet'
components:
  schemas:
    Pet:
      type: object
      required: [id, name, status]
      properties:
        id:
          type: integer
        name:
          type: string
        status:
          type: string
          enum: [available, pending, sold]
```

The generated code includes:

**schemas.ts:**
```typescript
import { Schema } from "@effect/schema"

export const Pet = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  status: Schema.Literal("available", "pending", "sold")
})
```

**endpoints.ts:**
```typescript
import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "@effect/platform"

export const petStoreApiGroup = HttpApiGroup.make('PetStoreApi')
  .add([
    listPets
  ])
```

**api.ts:**
```typescript
import { HttpApi } from "@effect/platform"

export const petStoreApi = HttpApi.make('PetStoreApi')
  .addGroup(petStoreApiGroup)
```

## OpenAPI 3.1 Feature Support

This package supports the full range of OpenAPI 3.1 features:

### Schema Types
- ✅ Primitive types (string, number, integer, boolean)
- ✅ Complex objects with nested properties
- ✅ Arrays with typed items
- ✅ Enums and literal values
- ✅ Optional vs required properties
- ✅ Schema references (`$ref`)

### HTTP Operations
- ✅ All HTTP methods (GET, POST, PUT, DELETE, PATCH, etc.)
- ✅ Path parameters with validation
- ✅ Query parameters with type coercion
- ✅ Request body validation
- ✅ Response schema validation
- ✅ Multiple response status codes

### Advanced Features
- ✅ Components and reusable schemas
- ✅ Operation IDs for endpoint naming
- ✅ Parameter validation and transformation
- ✅ Content type handling
- ✅ Comprehensive error handling

## Request/Response Validation

The package generates validation utilities for runtime type checking:

```typescript
import { createRequestValidator, createResponseValidator } from "effect-openapi-server-gen"

// Create validators from OpenAPI operations
const requestValidator = yield* createRequestValidator(operation)
const responseValidator = yield* createResponseValidator(operation.responses)

// Validate incoming requests
const validatedRequest = yield* requestValidator({
  params: { id: 123 },
  query: { limit: 10 },
  body: { name: "Fluffy", status: "available" }
})

// Validate outgoing responses
const validatedResponse = yield* responseValidator({
  status: 200,
  body: { id: 123, name: "Fluffy", status: "available" }
})
```

## Integration with Effect HttpApi

The generated code is designed to work seamlessly with Effect's HttpApi:

```typescript
import { HttpApiBuilder } from "@effect/platform"
import { petStoreApi } from "./generated"

const implementation = HttpApiBuilder.make(petStoreApi).pipe(
  HttpApiBuilder.handle("listPets", ({ query }) =>
    Effect.succeed([
      { id: 1, name: "Fluffy", status: "available" as const }
    ])
  ),
  // ... handle other endpoints
)
```

## Development

This project follows Test-Driven Development (TDD) practices:

```bash
# Run tests
pnpm test

# Run tests in watch mode
pnpm test --watch

# Type checking
pnpm run typecheck

# Linting
pnpm run lint

# Build
pnpm run build
```

## API Reference

### Core Functions

#### `parseOpenAPI(input: string | Record<string, unknown>): Effect<ParsedOpenAPISpec, OpenAPIParseError>`

Parses and validates an OpenAPI 3.1 specification.

#### `generateSchemasFromComponents(components?: ComponentsObject): Effect<string, SchemaGenerationError>`

Generates Effect Schema definitions from OpenAPI component schemas.

#### `generateHttpApiEndpoint(path: string, method: string, operation: OperationObject): Effect<string, EndpointGenerationError>`

Generates a single HttpApiEndpoint from an OpenAPI operation.

#### `generateHttpApiGroup(spec: ParsedOpenAPISpec): Effect<string, EndpointGenerationError>`

Generates an HttpApiGroup containing all endpoints from the specification.

#### `generateFullHttpApi(spec: ParsedOpenAPISpec): Effect<string, EndpointGenerationError>`

Generates a complete HttpApi with all groups and endpoints.

### Validation Functions

#### `createRequestValidator(operation: OperationObject): Effect<RequestValidator, ValidationError>`

Creates a request validator function from an OpenAPI operation.

#### `createResponseValidator(responses: ResponsesObject): Effect<ResponseValidator, ValidationError>`

Creates a response validator function from OpenAPI response definitions.

#### `validateRequest(request: Request, schemas: RequestValidationSchemas): Effect<ValidatedRequest, ValidationError>`

Validates a request against provided schemas.

#### `validateResponse(response: Response, schemas: ResponseValidationSchemas): Effect<ValidatedResponse, ValidationError>`

Validates a response against provided schemas.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for your changes
4. Implement your changes
5. Ensure all tests pass
6. Submit a pull request

## License

MIT

## Related Projects

- [Effect](https://effect.website) - The Effect TypeScript framework
- [OpenAPI Specification](https://spec.openapis.org/oas/v3.1.0) - API specification standard
- [@effect/platform](https://github.com/Effect-TS/effect/tree/main/packages/platform) - Effect's HTTP platform
- [@effect/schema](https://github.com/Effect-TS/effect/tree/main/packages/schema) - Effect's schema validation library