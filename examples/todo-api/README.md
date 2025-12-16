# Todo API Example

This example demonstrates the complete workflow of using `@davidgoli/openapi-server-gen` to build a type-safe Effect HttpServer from an OpenAPI specification.

## Files

- **`openapi.yaml`** - The OpenAPI 3.1 specification for a Todo API
- **`generated-api.ts`** - Generated code (do not edit manually)
- **`implementation.ts`** - Example implementation showing how to use the generated code
- **`package.json`** - Dependencies for running the example

## Features Demonstrated

This example shows how to:

- ✅ Define a complete REST API in OpenAPI 3.1
- ✅ Generate type-safe Effect code from the spec
- ✅ Implement handlers with full type inference
- ✅ Handle path and query parameters
- ✅ Handle request bodies and validation
- ✅ Return different status codes (200, 201, 204, 404, 400)
- ✅ Use Effect's dependency injection (Services and Layers)
- ✅ Build an in-memory data store with Effect Ref
- ✅ Run the server with NodeHttpServer

## Quick Start

### 1. Install Dependencies

```bash
cd examples/todo-api
pnpm install
```

### 2. Generate the API (already done in this example)

```bash
pnpm openapi-server-gen openapi.yaml generated-api.ts
```

### 3. Run the Server

```bash
pnpm tsx implementation.ts
```

The server will start on `http://localhost:3000`.

## Testing the API

### Create a todo

```bash
curl -X POST http://localhost:3000/api/todos \
  -H "Content-Type: application/json" \
  -d '{"title": "Buy groceries"}'
```

### List all todos

```bash
curl http://localhost:3000/api/todos
```

### Filter completed todos

```bash
curl http://localhost:3000/api/todos?completed=false
```

### Get a specific todo

```bash
curl http://localhost:3000/api/todos/{id}
```

### Update a todo

```bash
curl -X PATCH http://localhost:3000/api/todos/{id} \
  -H "Content-Type: application/json" \
  -d '{"completed": true}'
```

### Delete a todo

```bash
curl -X DELETE http://localhost:3000/api/todos/{id}
```

## Code Walkthrough

### Generated Code Structure

The generator creates:

```typescript
// 1. Schema definitions from components/schemas
export const TodoSchema = Schema.Struct({...})
export const CreateTodoRequestSchema = Schema.Struct({...})
export const UpdateTodoRequestSchema = Schema.Struct({...})
export const ErrorSchema = Schema.Struct({...})

// 2. Type exports for convenience
export type Todo = Schema.Schema.Type<typeof TodoSchema>
export type CreateTodoRequest = Schema.Schema.Type<typeof CreateTodoRequestSchema>
// ... etc

// 3. HTTP endpoint definitions
export const listTodos = HttpApiEndpoint.get('listTodos', '/todos')
  .setUrlParams(Schema.Struct({ completed: Schema.optional(Schema.BooleanFromString) }))
  .addSuccess(Schema.Array(TodoSchema))

// 4. API groups organized by tags
export const todosGroup = HttpApiGroup.make('todos')
  .add(listTodos)
  .add(createTodo)
  // ... etc

// 5. Complete API definition
export const TodoAPI = HttpApi.make('TodoAPI')
  .add(todosGroup)
```

### Implementation Pattern

The implementation follows Effect's layered architecture:

```typescript
// 1. Define a service for your business logic
class TodoStore extends Effect.Service<TodoStore>()('TodoStore', {
  effect: Effect.gen(function* () {
    // Service implementation
  })
}) {}

// 2. Implement handlers using HttpApiBuilder
const TodosLive = HttpApiBuilder.group(TodoAPI, 'todos', (handlers) =>
  handlers
    .handle('listTodos', ({ urlParams }) => {
      // Handler implementation - fully typed!
      // urlParams.completed is inferred as boolean | undefined
    })
    .handle('createTodo', ({ payload }) => {
      // payload is inferred as CreateTodoRequest
    })
    // ... etc
)

// 3. Compose layers
const TodoAPILive = HttpApiBuilder.api(TodoAPI)
  .pipe(Layer.provide(TodosLive))

// 4. Run with HTTP server
NodeRuntime.runMain(
  program.pipe(
    Effect.provide(TodoAPILive),
    Effect.provide(TodoStore.Default),
    Effect.provide(HttpLive)
  )
)
```

## Type Safety in Action

Notice how TypeScript infers everything:

```typescript
// Path parameters are typed
.handle('getTodo', ({ path }) => {
  path.id // ✅ string (from OpenAPI path parameter)
})

// Query parameters are typed and validated
.handle('listTodos', ({ urlParams }) => {
  urlParams.completed // ✅ boolean | undefined (from OpenAPI query param)
})

// Request bodies are typed
.handle('createTodo', ({ payload }) => {
  payload.title // ✅ string (required)
  payload.completed // ✅ boolean | undefined (optional with default)
})

// Return types match response schemas
.handle('createTodo', ({ payload }) => {
  return todo // ✅ Must match Todo schema
})
```

## Key Concepts

### Effect Services

Services encapsulate your business logic and can be easily tested and mocked:

```typescript
class TodoStore extends Effect.Service<TodoStore>()('TodoStore', {
  effect: Effect.gen(function* () {
    // Service implementation
    return {
      getAll: (completed?: boolean) => Effect<Array<Todo>>,
      getById: (id: string) => Effect<Todo, Error>,
      // ... etc
    }
  })
}) {}
```

### Error Handling

Effect's error handling makes it explicit what can fail:

```typescript
getById: (id: string) =>
  Effect.gen(function* () {
    const todo = yield* findTodo(id)
    if (!todo) {
      // Typed error - compiler knows this can fail
      return yield* Effect.fail({ message: 'Not found', code: 'NOT_FOUND' })
    }
    return todo
  })
```

### Layer Composition

Layers make dependency injection explicit and composable:

```typescript
const TodoAPILive = HttpApiBuilder.api(TodoAPI)
  .pipe(Layer.provide(TodosLive))  // Provide handler implementations

NodeRuntime.runMain(
  program.pipe(
    Effect.provide(TodoAPILive),      // Provide API layer
    Effect.provide(TodoStore.Default), // Provide store service
    Effect.provide(HttpLive)           // Provide HTTP server
  )
)
```

## Next Steps

- Modify `openapi.yaml` to add new endpoints
- Regenerate with `pnpm openapi-server-gen openapi.yaml generated-api.ts`
- Implement the new handlers in `implementation.ts`
- TypeScript will guide you with type errors if anything is missing!

## Learn More

- [Effect Documentation](https://effect.website)
- [@effect/platform HttpApi](https://effect.website/docs/guides/http-api)
- [Effect Schema](https://effect.website/docs/schema/introduction)
- [OpenAPI 3.1 Specification](https://spec.openapis.org/oas/v3.1.0)
