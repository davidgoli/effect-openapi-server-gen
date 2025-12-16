# @davigoli/openapi-server-gen

Generate type-safe [Effect](https://effect.website) HttpServer implementations from OpenAPI 3.1 specifications.

## Features

- ✨ **Complete Type Safety**: Generated code provides full TypeScript inference from OpenAPI spec to handler implementation
- 🔧 **Effect Schema Validation**: All request/response validation powered by [@effect/schema](https://effect.website/docs/schema/introduction)
- 🎯 **Clean Generated Code**: Single file output with no manual edits required
- 📦 **OpenAPI 3.1 Support**: Full support for modern OpenAPI features
- 🚀 **Ready for Production**: TDD implementation with 168+ passing tests

## What Gets Generated

From your OpenAPI spec, the generator creates:

- **Schema Definitions**: Effect Schema representations of all your models
- **HTTP Endpoints**: Fully typed `HttpApiEndpoint` definitions
- **API Groups**: Organized by OpenAPI tags
- **Complete API**: Single `HttpApi` export ready to implement

## Installation

```bash
pnpm add @davigoli/openapi-server-gen
# or
npm install @davigoli/openapi-server-gen
# or
yarn add @davigoli/openapi-server-gen
```

## Quick Start

### 1. Generate Server Code

```bash
pnpm tsx src/CLI/Program.ts ./api-spec.yaml ./generated/api.ts
```

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

## Supported OpenAPI Features

### ✅ Phase 1: Foundation & Basic Paths
- [x] GET, POST, PUT, PATCH, DELETE operations
- [x] Path parameters with type validation
- [x] Request bodies (application/json)
- [x] Response schemas
- [x] operationId requirement
- [x] Tag-based grouping

### ✅ Phase 2: Schema Components & References
- [x] Reusable schemas (`components/schemas`)
- [x] `$ref` resolution
- [x] Circular reference detection
- [x] Nested schemas
- [x] Array types with item schemas

### ✅ Phase 3: Advanced JSON Schema Features
- [x] **Enums & Literals**: `Schema.Literal` and `Schema.Union` generation
- [x] **String Validation**: minLength, maxLength, pattern (regex), format
- [x] **Number Validation**: minimum, maximum, multipleOf, exclusive bounds
- [x] **Nullable Types**: Both OpenAPI 3.0 (`nullable: true`) and 3.1 (`type: ["string", "null"]`) styles
- [x] **Schema Combinators**:
  - `allOf` → `Schema.extend()`
  - `oneOf` → `Schema.Union()`
  - `anyOf` → `Schema.Union()`

### ✅ Phase 4: Complete Request/Response Handling
- [x] **Query Parameters**: With validation rules
- [x] **Header Parameters**: Properly quoted names (`"X-API-Key"`)
- [x] **Multiple Response Codes**: 2xx success and 4xx/5xx errors
- [x] **Custom Status Codes**: `{ status: 201 }`, etc.
- [x] **Error Schemas**: Compatible with `Schema.TaggedError` pattern

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

## CLI Usage

```bash
pnpm tsx src/CLI/Program.ts <spec-file> <output-file>

# Examples:
pnpm tsx src/CLI/Program.ts ./api-spec.yaml ./generated/api.ts
pnpm tsx src/CLI/Program.ts ./petstore.json ./src/generated/petstore-api.ts
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

- Node.js 18+
- TypeScript 5.0+
- Effect 3.0+
- @effect/platform 0.93+
- @effect/schema 0.75+

## Project Status

**Current Version**: 0.1.0 (Beta)

**Completed Phases**:
- ✅ Phase 1: Foundation & Basic Paths
- ✅ Phase 2: Schema Components & References
- ✅ Phase 3: Advanced JSON Schema Features
- ✅ Phase 4: Complete Request/Response Handling

**Future Phases** (Optional):
- 🔜 Phase 5: Security & Authentication (API keys, OAuth2, etc.)
- 🔜 Phase 6: Advanced Features (multipart/form-data, webhooks, etc.)

## Testing

The project uses TDD with comprehensive test coverage:

```bash
# Run all tests
pnpm test

# Run specific test suite
pnpm test PathParser
pnpm test Phase4

# Generate coverage report
pnpm coverage
```

**Current Test Stats**: 168 tests passing across 13 test files

## Contributing

This project was built with Test-Driven Development. When contributing:

1. Write failing tests first
2. Implement the feature
3. Ensure all tests pass
4. Run linter: `pnpm lint-fix`

## Known Limitations

- Only `application/json` content type supported (Phase 6 will add more)
- Security schemes parsed but handlers not generated (Phase 5)
- Webhooks not yet supported (Phase 6)

## License

MIT

## Links

- [Effect Documentation](https://effect.website)
- [OpenAPI 3.1 Specification](https://spec.openapis.org/oas/v3.1.0)
- [@effect/platform HttpApi](https://effect.website/docs/guides/http-api)
- [Effect Schema](https://effect.website/docs/schema/introduction)

---

**Built with ❤️ using [Effect](https://effect.website) and TDD**
