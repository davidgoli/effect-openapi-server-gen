import { describe, expect, it } from '@effect/vitest'
import * as Effect from 'effect/Effect'
import * as CodeEmitter from '../../../src/Generator/CodeEmitter.js'

describe('CodeEmitter', () => {
  describe('emit', () => {
    it('should add file header comment', () =>
      Effect.gen(function* () {
        const code = 'const test = "hello"'

        const result = yield* CodeEmitter.emit(code)

        expect(result).toContain('/**')
        expect(result).toContain('* Generated')
        expect(result).toContain('@davidgoli/openapi-server-gen')
        expect(result).toContain('DO NOT EDIT')
      }))

    it('should include the generated code', () =>
      Effect.gen(function* () {
        const code = 'import * as Schema from "effect/Schema"\n\nconst MySchema = Schema.String'

        const result = yield* CodeEmitter.emit(code)

        expect(result).toContain('import * as Schema from "effect/Schema"')
        expect(result).toContain('const MySchema = Schema.String')
      }))

    it('should preserve formatting', () =>
      Effect.gen(function* () {
        const code = ['const users = HttpApiGroup.make("users")', '  .add(getUser)', '  .add(createUser)'].join('\n')

        const result = yield* CodeEmitter.emit(code)

        expect(result).toContain('.add(getUser)')
        expect(result).toContain('.add(createUser)')
      }))
  })

  describe('export style configuration - Phase 9', () => {
    it.effect('should generate named exports by default', () =>
      Effect.gen(function* () {
        const code = 'export const MySchema = Schema.String'

        const result = yield* CodeEmitter.emit(code)

        // Default behavior is named exports - code passes through unchanged
        expect(result).toContain('export const MySchema')
      })
    )

    it.effect('should add namespace export when configured', () =>
      Effect.gen(function* () {
        const code = 'export const UserSchema = Schema.String\nexport const PostSchema = Schema.Number'
        const exportNames = ['UserSchema', 'PostSchema']

        const result = yield* CodeEmitter.emit(code, {
          exportStyle: 'namespace',
          exportNames,
          namespaceName: 'Schemas',
        })

        // Should add namespace object at the end
        expect(result).toContain('export const UserSchema')
        expect(result).toContain('export const PostSchema')
        expect(result).toContain('export const Schemas = {')
        expect(result).toContain('UserSchema')
        expect(result).toContain('PostSchema')
      })
    )

    it.effect('should generate default export when configured', () =>
      Effect.gen(function* () {
        const code = 'export const UserSchema = Schema.String'
        const exportNames = ['UserSchema']

        const result = yield* CodeEmitter.emit(code, {
          exportStyle: 'default',
          exportNames,
        })

        // Should add default export at the end
        expect(result).toContain('export const UserSchema')
        expect(result).toContain('export default {')
        expect(result).toContain('UserSchema')
      })
    )
  })
})
