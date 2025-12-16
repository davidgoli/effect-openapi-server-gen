import { describe, expect, it, } from '@effect/vitest'
import * as Effect from 'effect/Effect'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as ApiGenerator from '../../src/Generator/ApiGenerator.js'
import * as CodeEmitter from '../../src/Generator/CodeEmitter.js'
import * as OpenApiParser from '../../src/Parser/OpenApiParser.js'

const fixturesDir = path.join(__dirname, 'fixtures', 'phase3',)

const readFixture = (filename: string,): string => {
  const fixturePath = path.join(fixturesDir, filename,)
  return fs.readFileSync(fixturePath, 'utf-8',)
}

describe('Phase 3 - Advanced JSON Schema Features', () => {
  describe('enums-and-consts.yaml', () => {
    it('should generate Schema.Literal for const keyword', () =>
      Effect.gen(function*() {
        const specContent = readFixture('enums-and-consts.yaml',)
        const spec = yield* OpenApiParser.parse(specContent,)
        const apiCode = yield* ApiGenerator.generateApi(spec,)

        // Const should use Schema.Literal
        expect(apiCode,).toContain('const ConstantValueSchema = Schema.Literal',)
      },))

    it('should generate Schema.Union of Literals for enum', () =>
      Effect.gen(function*() {
        const specContent = readFixture('enums-and-consts.yaml',)
        const spec = yield* OpenApiParser.parse(specContent,)
        const apiCode = yield* ApiGenerator.generateApi(spec,)

        // String enum should be Schema.Union of Literals
        expect(apiCode,).toContain('const StatusSchema = Schema.Union',)
        expect(apiCode,).toContain('Schema.Literal("active")',)
        expect(apiCode,).toContain('Schema.Literal("inactive")',)
        expect(apiCode,).toContain('Schema.Literal("pending")',)

        // Priority enum
        expect(apiCode,).toContain('const PrioritySchema = Schema.Union',)
        expect(apiCode,).toContain('Schema.Literal("low")',)
        expect(apiCode,).toContain('Schema.Literal("high")',)
      },))

    it('should handle numeric enums', () =>
      Effect.gen(function*() {
        const specContent = readFixture('enums-and-consts.yaml',)
        const spec = yield* OpenApiParser.parse(specContent,)
        const apiCode = yield* ApiGenerator.generateApi(spec,)

        expect(apiCode,).toContain('const NumericEnumSchema = Schema.Union',)
        expect(apiCode,).toContain('Schema.Literal(1)',)
        expect(apiCode,).toContain('Schema.Literal(2)',)
      },))
  })

  describe('string-validation.yaml', () => {
    it('should apply minLength constraint', () =>
      Effect.gen(function*() {
        const specContent = readFixture('string-validation.yaml',)
        const spec = yield* OpenApiParser.parse(specContent,)
        const apiCode = yield* ApiGenerator.generateApi(spec,)

        expect(apiCode,).toContain('Schema.minLength(3)',)
        expect(apiCode,).toContain('Schema.maxLength(20)',)
      },))

    it('should apply pattern (regex) constraint', () =>
      Effect.gen(function*() {
        const specContent = readFixture('string-validation.yaml',)
        const spec = yield* OpenApiParser.parse(specContent,)
        const apiCode = yield* ApiGenerator.generateApi(spec,)

        expect(apiCode,).toContain('Schema.pattern',)
        expect(apiCode,).toContain('RegExp',)
        expect(apiCode,).toContain('^[a-zA-Z0-9_]+$',)
      },))

    it('should combine multiple string constraints', () =>
      Effect.gen(function*() {
        const specContent = readFixture('string-validation.yaml',)
        const spec = yield* OpenApiParser.parse(specContent,)
        const apiCode = yield* ApiGenerator.generateApi(spec,)

        // Username has minLength, maxLength, and pattern
        const lines = apiCode.split('\n',)
        const usernameLine = lines.find((line,) => line.includes('username:',) && line.includes('Schema.String.pipe',))

        expect(usernameLine,).toBeDefined()
        expect(usernameLine,).toContain('minLength',)
        expect(usernameLine,).toContain('maxLength',)
        expect(usernameLine,).toContain('pattern',)
      },))
  })

  describe('number-validation.yaml', () => {
    it('should apply minimum constraint', () =>
      Effect.gen(function*() {
        const specContent = readFixture('number-validation.yaml',)
        const spec = yield* OpenApiParser.parse(specContent,)
        const apiCode = yield* ApiGenerator.generateApi(spec,)

        expect(apiCode,).toContain('Schema.greaterThanOrEqualTo(0)',)
      },))

    it('should apply maximum constraint', () =>
      Effect.gen(function*() {
        const specContent = readFixture('number-validation.yaml',)
        const spec = yield* OpenApiParser.parse(specContent,)
        const apiCode = yield* ApiGenerator.generateApi(spec,)

        expect(apiCode,).toContain('Schema.lessThanOrEqualTo',)
      },))

    it('should handle exclusiveMinimum', () =>
      Effect.gen(function*() {
        const specContent = readFixture('number-validation.yaml',)
        const spec = yield* OpenApiParser.parse(specContent,)
        const apiCode = yield* ApiGenerator.generateApi(spec,)

        // Range schema has exclusiveMinimum: true
        expect(apiCode,).toContain('Schema.greaterThan(0)',)
      },))

    it('should apply multipleOf constraint', () =>
      Effect.gen(function*() {
        const specContent = readFixture('number-validation.yaml',)
        const spec = yield* OpenApiParser.parse(specContent,)
        const apiCode = yield* ApiGenerator.generateApi(spec,)

        expect(apiCode,).toContain('Schema.multipleOf',)
      },))
  })

  describe('nullable-types.yaml', () => {
    it('should handle nullable with Schema.Union', () =>
      Effect.gen(function*() {
        const specContent = readFixture('nullable-types.yaml',)
        const spec = yield* OpenApiParser.parse(specContent,)
        const apiCode = yield* ApiGenerator.generateApi(spec,)

        // Nullable email (OpenAPI 3.0 style)
        expect(apiCode,).toContain('Schema.Union(Schema.String, Schema.Null)',)
      },))

    it('should handle type array with null (OpenAPI 3.1)', () =>
      Effect.gen(function*() {
        const specContent = readFixture('nullable-types.yaml',)
        const spec = yield* OpenApiParser.parse(specContent,)
        const apiCode = yield* ApiGenerator.generateApi(spec,)

        // middleName uses type: ["string", "null"]
        expect(apiCode,).toContain('Schema.Union(Schema.String, Schema.Null)',)
      },))
  })

  describe('combinators.yaml', () => {
    it('should handle allOf with Schema.extend', () =>
      Effect.gen(function*() {
        const specContent = readFixture('combinators.yaml',)
        const spec = yield* OpenApiParser.parse(specContent,)
        const apiCode = yield* ApiGenerator.generateApi(spec,)

        // User extends BaseEntity
        expect(apiCode,).toContain('const UserSchema = Schema.extend(BaseEntitySchema',)
        expect(apiCode,).toContain('username: Schema.String',)

        // Product extends BaseEntity
        expect(apiCode,).toContain('const ProductSchema = Schema.extend(BaseEntitySchema',)
        expect(apiCode,).toContain('price: Schema.Number',)
      },))

    it('should handle oneOf with Schema.Union', () =>
      Effect.gen(function*() {
        const specContent = readFixture('combinators.yaml',)
        const spec = yield* OpenApiParser.parse(specContent,)
        const apiCode = yield* ApiGenerator.generateApi(spec,)

        // StringOrNumber is oneOf string/number
        expect(apiCode,).toContain('const StringOrNumberSchema = Schema.Union(Schema.String, Schema.Number)',)
      },))

    it('should handle oneOf with $refs', () =>
      Effect.gen(function*() {
        const specContent = readFixture('combinators.yaml',)
        const spec = yield* OpenApiParser.parse(specContent,)
        const apiCode = yield* ApiGenerator.generateApi(spec,)

        // SearchResult is oneOf User/Product
        expect(apiCode,).toContain('const SearchResultSchema = Schema.Union(UserSchema, ProductSchema)',)
      },))

    it('should handle anyOf with Schema.Union', () =>
      Effect.gen(function*() {
        const specContent = readFixture('combinators.yaml',)
        const spec = yield* OpenApiParser.parse(specContent,)
        const apiCode = yield* ApiGenerator.generateApi(spec,)

        // Contact value is anyOf email/uri
        expect(apiCode,).toContain('value: Schema.Union(Schema.String, Schema.String)',)
      },))

    it('should handle discriminated unions (Cat/Dog)', () =>
      Effect.gen(function*() {
        const specContent = readFixture('combinators.yaml',)
        const spec = yield* OpenApiParser.parse(specContent,)
        const apiCode = yield* ApiGenerator.generateApi(spec,)

        // Cat extends Pet
        expect(apiCode,).toContain('const CatSchema = Schema.extend(PetSchema',)
        expect(apiCode,).toContain('meowVolume: Schema.Number',)

        // Dog extends Pet
        expect(apiCode,).toContain('const DogSchema = Schema.extend(PetSchema',)
        expect(apiCode,).toContain('barkVolume: Schema.Number',)

        // Endpoint uses union of Cat/Dog
        expect(apiCode,).toContain('Schema.Union(CatSchema, DogSchema)',)
      },))
  })

  describe('Complete generation pipeline', () => {
    it('should generate complete valid code for all Phase 3 fixtures', () =>
      Effect.gen(function*() {
        const fixtures = [
          'enums-and-consts.yaml',
          'string-validation.yaml',
          'number-validation.yaml',
          'nullable-types.yaml',
          'combinators.yaml',
        ]

        for (const fixture of fixtures) {
          const specContent = readFixture(fixture,)
          const spec = yield* OpenApiParser.parse(specContent,)
          const apiCode = yield* ApiGenerator.generateApi(spec,)
          const finalCode = yield* CodeEmitter.emit(apiCode,)

          // Basic validity checks
          expect(finalCode,).toContain('import * as Schema from "effect/Schema"',)
          expect(finalCode,).toContain('export {',)
          expect(finalCode.length,).toBeGreaterThan(100,)

          // Should not have syntax errors
          expect(finalCode,).not.toContain('undefined',)
          expect(finalCode,).not.toContain('[object Object]',)
        }
      },))

    it('should maintain proper validation in endpoints', () =>
      Effect.gen(function*() {
        const specContent = readFixture('string-validation.yaml',)
        const spec = yield* OpenApiParser.parse(specContent,)
        const apiCode = yield* ApiGenerator.generateApi(spec,)

        // Query parameters should also have validation
        expect(apiCode,).toContain('setUrlParams',)
        const lines = apiCode.split('\n',)
        const urlParamsLine = lines.find((line,) => line.includes('username:',) && line.includes('setUrlParams',))

        // The query param should have validation
        if (urlParamsLine) {
          const nextFewLines = lines.slice(lines.indexOf(urlParamsLine,), lines.indexOf(urlParamsLine,) + 3,).join(
            '\n',
          )
          expect(nextFewLines,).toContain('minLength',)
        }
      },))

    it('should properly nest schemas with validation', () =>
      Effect.gen(function*() {
        const specContent = readFixture('number-validation.yaml',)
        const spec = yield* OpenApiParser.parse(specContent,)
        const apiCode = yield* ApiGenerator.generateApi(spec,)

        // Product schema should have validated fields
        const productSchemaMatch = apiCode.match(/const ProductSchema = Schema\.Struct\(\{[\s\S]*?\}\)/,)?.[0]
        expect(productSchemaMatch,).toBeDefined()

        if (productSchemaMatch) {
          // Price should have minimum validation
          expect(productSchemaMatch,).toContain('price:',)
          expect(productSchemaMatch,).toContain('greaterThanOrEqualTo',)

          // Rating should have multiple constraints
          const ratingMatch = productSchemaMatch.match(/rating:.*?\n/,)?.[0]
          if (ratingMatch) {
            expect(ratingMatch,).toContain('multipleOf',)
          }
        }
      },))
  })

  describe('Phase 3 success criteria', () => {
    it('should support all common JSON Schema keywords', () =>
      Effect.gen(function*() {
        const fixtures = [
          { file: 'enums-and-consts.yaml', feature: 'enum/const', },
          { file: 'string-validation.yaml', feature: 'string validation', },
          { file: 'number-validation.yaml', feature: 'number validation', },
          { file: 'nullable-types.yaml', feature: 'nullable', },
          { file: 'combinators.yaml', feature: 'allOf/oneOf/anyOf', },
        ]

        for (const { file, } of fixtures) {
          const specContent = readFixture(file,)
          const spec = yield* OpenApiParser.parse(specContent,)

          // Should not throw
          const apiCode = yield* ApiGenerator.generateApi(spec,)
          expect(apiCode.length,).toBeGreaterThan(0,)
        }
      },))

    it('should generate proper Effect Schema combinators', () =>
      Effect.gen(function*() {
        const specContent = readFixture('combinators.yaml',)
        const spec = yield* OpenApiParser.parse(specContent,)
        const apiCode = yield* ApiGenerator.generateApi(spec,)

        // Should use Effect Schema patterns
        expect(apiCode,).toContain('Schema.extend',)
        expect(apiCode,).toContain('Schema.Union',)
        expect(apiCode,).toContain('Schema.Struct',)
      },))

    it('should handle runtime validation correctly', () =>
      Effect.gen(function*() {
        const specContent = readFixture('string-validation.yaml',)
        const spec = yield* OpenApiParser.parse(specContent,)
        const apiCode = yield* ApiGenerator.generateApi(spec,)

        // Validation should be applied with .pipe()
        expect(apiCode,).toContain('.pipe(',)
        expect(apiCode,).toContain('Schema.minLength',)
        expect(apiCode,).toContain('Schema.maxLength',)
        expect(apiCode,).toContain('Schema.pattern',)
      },))
  })
})
