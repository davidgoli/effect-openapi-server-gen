# Examples

This directory contains complete, working examples of using `@davidgoli/openapi-server-gen` to build Effect HttpServer applications.

## Available Examples

### [Todo API](./todo-api)

A complete CRUD API for managing todos, demonstrating:

- ✅ Full REST API implementation (GET, POST, PATCH, DELETE)
- ✅ Path and query parameters
- ✅ Request body validation
- ✅ Multiple response status codes (200, 201, 204, 404, 400)
- ✅ Effect Services for business logic
- ✅ In-memory data store with Effect Ref
- ✅ Complete type safety from OpenAPI to handlers

**Perfect for:** Learning the basics and seeing a complete workflow

## Running Examples

Each example is self-contained with its own `package.json`. To run an example:

```bash
cd examples/todo-api
pnpm install
pnpm start
```

## Example Structure

Each example follows this pattern:

```
example-name/
├── openapi.yaml         # OpenAPI 3.1 specification
├── generated-api.ts     # Generated code (don't edit!)
├── implementation.ts    # Your handler implementation
├── package.json        # Dependencies
└── README.md           # Detailed walkthrough
```

## Creating Your Own

1. **Define your API** in an OpenAPI 3.1 spec
2. **Generate the code**:
   ```bash
   npx @davidgoli/openapi-server-gen openapi.yaml generated-api.ts
   ```
3. **Implement handlers** using the generated types
4. **Run your server**!

See each example's README for detailed explanations and code walkthroughs.
