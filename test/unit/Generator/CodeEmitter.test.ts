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
})
