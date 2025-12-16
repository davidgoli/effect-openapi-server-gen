/**
 * Example implementation of the Todo API
 *
 * This shows how to implement handlers for the generated API.
 */
import { Effect, Layer, Ref } from 'effect'
import type { Schema } from 'effect'
import { HttpApiBuilder } from '@effect/platform'
import { NodeHttpServer, NodeRuntime } from '@effect/platform-node'
import * as Http from 'node:http'
import {
  TodoAPI,
  type TodoSchema,
  type CreateTodoRequestSchema,
  type UpdateTodoRequestSchema,
} from './generated-api.js'

/**
 * Derive types from schemas
 */
type Todo = Schema.Schema.Type<typeof TodoSchema>
type CreateTodoRequest = Schema.Schema.Type<typeof CreateTodoRequestSchema>
type UpdateTodoRequest = Schema.Schema.Type<typeof UpdateTodoRequestSchema>

/**
 * In-memory todo store
 * In a real app, this would be a database service
 */
class TodoStore extends Effect.Service<TodoStore>()('TodoStore', {
  effect: Effect.gen(function* () {
    const store = yield* Ref.make<Map<string, Todo>>(new Map())

    return {
      getAll: (completed?: boolean) =>
        Effect.gen(function* () {
          const todos = yield* Ref.get(store)
          let items = Array.from(todos.values())

          if (completed !== undefined) {
            items = items.filter((todo) => todo.completed === completed)
          }

          return items
        }),

      getById: (id: string) =>
        Effect.gen(function* () {
          const todos = yield* Ref.get(store)
          const todo = todos.get(id)

          if (!todo) {
            return yield* Effect.fail({ message: 'Todo not found', code: 'NOT_FOUND' })
          }

          return todo
        }),

      create: (request: CreateTodoRequest) =>
        Effect.gen(function* () {
          const id = crypto.randomUUID()
          const todo: Todo = {
            id,
            title: request.title,
            completed: request.completed ?? false,
            createdAt: new Date().toISOString(),
          }

          yield* Ref.update(store, (todos) => new Map(todos).set(id, todo))
          return todo
        }),

      update: (id: string, request: UpdateTodoRequest) =>
        Effect.gen(function* () {
          const todos = yield* Ref.get(store)
          const existing = todos.get(id)

          if (!existing) {
            return yield* Effect.fail({ message: 'Todo not found', code: 'NOT_FOUND' })
          }

          const updated: Todo = {
            ...existing,
            ...(request.title !== undefined && { title: request.title }),
            ...(request.completed !== undefined && { completed: request.completed }),
          }

          yield* Ref.update(store, (todos) => new Map(todos).set(id, updated))
          return updated
        }),

      delete: (id: string) =>
        Effect.gen(function* () {
          const todos = yield* Ref.get(store)

          if (!todos.has(id)) {
            return yield* Effect.fail({ message: 'Todo not found', code: 'NOT_FOUND' })
          }

          yield* Ref.update(store, (todos) => {
            const newTodos = new Map(todos)
            newTodos.delete(id)
            return newTodos
          })
        }),
    }
  }),
}) {}

/**
 * Implement the Todos group handlers
 */
const TodosLive = HttpApiBuilder.group(TodoAPI, 'Todos', (handlers) =>
  Effect.gen(function* () {
    const store = yield* TodoStore

    return handlers
      .handle('listTodos', ({ urlParams }) =>
        Effect.gen(function* () {
          const completed = urlParams.completed
          const todos = yield* store.getAll(completed)
          return todos
        })
      )
      .handle('createTodo', ({ payload }) =>
        Effect.gen(function* () {
          const todo = yield* store.create(payload)
          return todo
        })
      )
      .handle('getTodo', ({ path }) =>
        Effect.gen(function* () {
          const todo = yield* store.getById(path.id)
          return todo
        })
      )
      .handle('updateTodo', ({ path, payload }) =>
        Effect.gen(function* () {
          const todo = yield* store.update(path.id, payload)
          return todo
        })
      )
      .handle('deleteTodo', ({ path }) =>
        Effect.gen(function* () {
          yield* store.delete(path.id)
          // For 204 No Content, return undefined
          return undefined as any
        })
      )
  })
)

/**
 * Build the complete API with all implementations
 */
const TodoAPILive = HttpApiBuilder.api(TodoAPI).pipe(Layer.provide(TodosLive))

/**
 * Create the HTTP server
 */
const HttpLive = NodeHttpServer.layer(() => Http.createServer(), { port: 3000 })

/**
 * Serve the API using the HTTP server
 */
const ServerLive = HttpApiBuilder.serve().pipe(Layer.provide(TodoAPILive), Layer.provide(HttpLive))

/**
 * Main program
 */
const program = Effect.gen(function* () {
  console.log('🚀 Todo API server running on http://localhost:3000')
  console.log('📝 API routes:')
  console.log('  GET    http://localhost:3000/todos')
  console.log('  POST   http://localhost:3000/todos')
  console.log('  GET    http://localhost:3000/todos/{id}')
  console.log('  PATCH  http://localhost:3000/todos/{id}')
  console.log('  DELETE http://localhost:3000/todos/{id}')

  yield* Effect.never
})

/**
 * Run the program with all dependencies
 */
NodeRuntime.runMain(program.pipe(Effect.provide(ServerLive), Effect.provide(TodoStore.Default)))
