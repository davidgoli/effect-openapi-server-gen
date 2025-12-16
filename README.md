# @davidgoli/openapi-server-gen

Generate type-safe [Effect](https://effect.website) HttpServer implementations from OpenAPI 3.1 specifications.

## Features

- ✨ **Type Safe**: Full TypeScript inference from OpenAPI spec to handler implementation
- 🔧 **Runtime Validation**: Request/response validation powered by [Effect Schema](https://effect.website/docs/schema/introduction)
- 🎯 **Clean Generated Code**: Single file output, no manual editing required
- 📦 **OpenAPI 3.1**: Full support for modern OpenAPI specifications
- 🚀 **Production Ready**: Comprehensive test coverage with real-world API validation

## What Gets Generated

From your OpenAPI spec, the generator creates:

- **Schema Definitions**: Effect Schema representations of all your models
- **HTTP Endpoints**: Fully typed `HttpApiEndpoint` definitions
- **API Groups**: Organized by OpenAPI tags
- **Complete API**: Single `HttpApi` export ready to implement

## Installation

You can use the generator without installing via `npx`, or install it globally/locally:

```bash
# Use directly with npx (recommended)
npx @davidgoli/openapi-server-gen ./api-spec.yaml ./generated/api.ts

# Or install globally
pnpm add -g @davidgoli/openapi-server-gen

# Or add to project
pnpm add -D @davidgoli/openapi-server-gen
```

## Quick Start

### 1. Generate Server Code

Run the generator with your OpenAPI spec:

```bash
# Using npx (no installation needed)
npx @davidgoli/openapi-server-gen ./api-spec.yaml ./generated/api.ts

# Or if installed globally
openapi-server-gen ./api-spec.yaml ./generated/api.ts

# Or via package.json script
pnpm openapi-server-gen ./api-spec.yaml ./generated/api.ts
```

This will generate a single TypeScript file with all your API definitions.

### 2. Implement Handlers

```typescript
import { Effect, Layer } from "effect"
import { HttpApiBuilder } from "@effect/platform"
import { MyApi } from "./generated/api"

// Implement your handlers with full type safety
const UsersLive = HttpApiBuilder.group(MyApi, "users", (handlers) =>
  handlers
    // TypeScript knows the exact shape of path params, query params, body, etc.
    .handle("getUser", ({ path }) =>
      Effect.succeed({
        id: path.userId,
        name: "Alice",
        email: "alice@example.com"
      })
    )
    .handle("createUser", ({ payload }) =>
      Effect.succeed({
        id: crypto.randomUUID(),
        name: payload.name,
        email: payload.email
      })
    )
)

const MyApiLive = HttpApiBuilder.api(MyApi).pipe(
  Layer.provide(UsersLive)
)
```

## Examples

Check out the [examples](./examples) directory for complete, working examples:

- **[Todo API](./examples/todo-api)** - Full CRUD API with in-memory store, showing:
  - Path and query parameters
  - Request validation
  - Multiple status codes
  - Effect Services and Layers
  - Complete type safety

Each example includes a detailed README with code walkthrough and testing instructions.

## Supported OpenAPI Features

### HTTP Operations
- All standard methods: GET, POST, PUT, PATCH, DELETE
- Path parameters with type validation
- Query parameters with validation rules
- Header parameters with proper quoting
- Request bodies (application/json)
- Response schemas with multiple status codes

### Schema Support
- **Components**: Reusable schemas with `$ref` resolution
- **Nested Objects**: Deep nesting and complex hierarchies
- **Arrays**: Typed arrays with item validation
- **Circular References**: Automatic detection and handling
- **Enums & Literals**: `Schema.Literal` and `Schema.Union` generation
- **Nullable Types**: Both OpenAPI 3.0 and 3.1 syntax
- **Schema Combinators**:
  - `allOf` → `Schema.extend()`
  - `oneOf` / `anyOf` → `Schema.Union()`

### Validation Rules
- **Strings**: minLength, maxLength, pattern (regex), format (email, uuid, date-time, etc.)
- **Numbers**: minimum, maximum, multipleOf, exclusive bounds
- **Arrays**: minItems, maxItems
- **Objects**: required fields, optional fields

### API Organization
- Tag-based grouping into `HttpApiGroup`
- Server URL prefixes
- operationId as endpoint identifiers
- Deprecation annotations

## Example Generated Code

### Input: OpenAPI Spec
```yaml
openapi: 3.1.0
info:
  title: Users API
  version: 1.0.0
paths:
  /users/{userId}:
    get:
      operationId: getUser
      tags: [users]
      parameters:
        - name: userId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: User found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '404':
          description: User not found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
components:
  schemas:
    User:
      type: object
      required: [id, name, email]
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
          minLength: 1
          maxLength: 100
        email:
          type: string
          format: email
    Error:
      type: object
      required: [code, message]
      properties:
        code:
          type: string
        message:
          type: string
```

### Output: Generated TypeScript
```typescript
import * as HttpApi from "@effect/platform/HttpApi"
import * as HttpApiEndpoint from "@effect/platform/HttpApiEndpoint"
import * as HttpApiGroup from "@effect/platform/HttpApiGroup"
import * as HttpApiSchema from "@effect/platform/HttpApiSchema"
import * as Schema from "effect/Schema"

// Schema definitions from components/schemas
const UserSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100)),
  email: Schema.String
})

const ErrorSchema = Schema.Struct({
  code: Schema.String,
  message: Schema.String
})

// Endpoints
const userIdParam = HttpApiSchema.param("userId", Schema.String)
const getUser = HttpApiEndpoint.get("getUser")`/users/${userIdParam}`
  .addSuccess(UserSchema)
  .addError(ErrorSchema, { status: 404 })

const usersGroup = HttpApiGroup.make("users")
  .add(getUser)

const UsersAPI = HttpApi.make("UsersAPI")
  .add(usersGroup)

export { UsersAPI }
```

## CLI Reference

```bash
# Basic usage
openapi-server-gen <spec-file> <output-file>

# Examples
openapi-server-gen ./api-spec.yaml ./generated/api.ts
openapi-server-gen ./petstore.json ./src/generated/petstore-api.ts

# With npx (no installation)
npx @davidgoli/openapi-server-gen ./api-spec.yaml ./generated/api.ts
```

## Validation Features

The generator automatically creates validation rules from your OpenAPI schema:

### String Validation
```yaml
username:
  type: string
  minLength: 3
  maxLength: 20
  pattern: "^[a-zA-Z0-9_]+$"
```
↓
```typescript
username: Schema.String.pipe(
  Schema.minLength(3),
  Schema.maxLength(20),
  Schema.pattern(new RegExp("^[a-zA-Z0-9_]+$"))
)
```

### Number Validation
```yaml
age:
  type: integer
  minimum: 0
  maximum: 120
```
↓
```typescript
age: Schema.Number.pipe(
  Schema.greaterThanOrEqualTo(0),
  Schema.lessThanOrEqualTo(120)
)
```

### Enum Types
```yaml
status:
  type: string
  enum: [active, inactive, pending]
```
↓
```typescript
status: Schema.Union(
  Schema.Literal("active"),
  Schema.Literal("inactive"),
  Schema.Literal("pending")
)
```

## Design Principles

1. **Generated Code is Read-Only**: Never edit generated files manually - regenerate instead
2. **Single Source of Truth**: Your OpenAPI spec is the source of truth
3. **Full Type Safety**: TypeScript enforces correctness at compile time
4. **Effect-First**: Leverages Effect's type system and error handling
5. **Validation Everywhere**: Runtime validation powered by Effect Schema

## Requirements

Your project needs:
- Node.js 18+
- TypeScript 5.0+

Generated code depends on:
- `effect` ^3.17.0
- `@effect/platform` ^0.87.0
- `@effect/platform-node` ^0.82.0 (for NodeHttpServer)

## Current Limitations

- **Content Types**: Only `application/json` is currently supported
- **Security**: Security schemes are parsed but authentication handlers must be implemented manually
- **Advanced Features**: Webhooks, multipart/form-data, and cookie parameters are not yet supported

These features may be added in future versions based on user demand.

## Contributing

Contributions are welcome! This project follows test-driven development:

1. Write tests for new features first
2. Implement the feature to make tests pass
3. Ensure all existing tests still pass
4. Run `pnpm lint-fix` and `pnpm format` before committing

Run tests with `pnpm test` or generate coverage with `pnpm coverage`.

## License

MIT

## Resources

- [Effect Documentation](https://effect.website) - Learn about the Effect ecosystem
- [OpenAPI 3.1 Specification](https://spec.openapis.org/oas/v3.1.0) - Official OpenAPI docs
- [Effect Platform HttpApi Guide](https://effect.website/docs/guides/http-api) - Building HTTP APIs with Effect
- [Effect Schema Documentation](https://effect.website/docs/schema/introduction) - Schema validation and transformation

## See Also

- [Examples Directory](./examples) - Complete working examples with detailed guides
- [Effect Community](https://effect.website/docs/community/community) - Get help and connect with other Effect users
