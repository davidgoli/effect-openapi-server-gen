import { describe, expect, it } from 'vitest'
import { Effect } from 'effect'
import * as ServerParser from '../../../src/Parser/ServerParser.js'
import type * as OpenApiParser from '../../../src/Parser/OpenApiParser.js'

describe('ServerParser', () => {
  describe('parseServers', () => {
    it('should handle spec with no servers', () => {
      const spec: OpenApiParser.OpenApiSpec = {
        openapi: '3.1.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
      }

      const result = Effect.runSync(ServerParser.parseServers(spec))

      expect(result.servers).toEqual([])
      expect(result.pathPrefix).toBeUndefined()
    })

    it('should parse single server with description', () => {
      const spec: OpenApiParser.OpenApiSpec = {
        openapi: '3.1.0',
        info: { title: 'Test API', version: '1.0.0' },
        servers: [{ url: 'https://api.example.com/v1', description: 'Production server' }],
        paths: {},
      }

      const result = Effect.runSync(ServerParser.parseServers(spec))

      expect(result.servers).toHaveLength(1)
      expect(result.servers[0].url).toBe('https://api.example.com/v1')
      expect(result.servers[0].description).toBe('Production server')
      expect(result.pathPrefix).toBe('/v1')
    })

    it('should parse multiple servers', () => {
      const spec: OpenApiParser.OpenApiSpec = {
        openapi: '3.1.0',
        info: { title: 'Test API', version: '1.0.0' },
        servers: [
          { url: 'https://api.example.com/v1', description: 'Production' },
          { url: 'https://staging.example.com/v1', description: 'Staging' },
          { url: 'http://localhost:3000/v1', description: 'Local' },
        ],
        paths: {},
      }

      const result = Effect.runSync(ServerParser.parseServers(spec))

      expect(result.servers).toHaveLength(3)
      expect(result.pathPrefix).toBe('/v1')
    })

    it('should extract path prefix from full URL', () => {
      const spec: OpenApiParser.OpenApiSpec = {
        openapi: '3.1.0',
        info: { title: 'Test API', version: '1.0.0' },
        servers: [{ url: 'https://api.example.com/api/v2' }],
        paths: {},
      }

      const result = Effect.runSync(ServerParser.parseServers(spec))

      expect(result.pathPrefix).toBe('/api/v2')
    })

    it('should handle server URL with only domain (no path prefix)', () => {
      const spec: OpenApiParser.OpenApiSpec = {
        openapi: '3.1.0',
        info: { title: 'Test API', version: '1.0.0' },
        servers: [{ url: 'https://api.example.com' }],
        paths: {},
      }

      const result = Effect.runSync(ServerParser.parseServers(spec))

      expect(result.pathPrefix).toBeUndefined()
    })

    it('should handle server URL with root path', () => {
      const spec: OpenApiParser.OpenApiSpec = {
        openapi: '3.1.0',
        info: { title: 'Test API', version: '1.0.0' },
        servers: [{ url: 'https://api.example.com/' }],
        paths: {},
      }

      const result = Effect.runSync(ServerParser.parseServers(spec))

      expect(result.pathPrefix).toBeUndefined()
    })

    it('should handle relative URL (just path)', () => {
      const spec: OpenApiParser.OpenApiSpec = {
        openapi: '3.1.0',
        info: { title: 'Test API', version: '1.0.0' },
        servers: [{ url: '/api/v1' }],
        paths: {},
      }

      const result = Effect.runSync(ServerParser.parseServers(spec))

      expect(result.pathPrefix).toBe('/api/v1')
    })

    it('should handle server without description', () => {
      const spec: OpenApiParser.OpenApiSpec = {
        openapi: '3.1.0',
        info: { title: 'Test API', version: '1.0.0' },
        servers: [{ url: 'https://api.example.com/v1' }],
        paths: {},
      }

      const result = Effect.runSync(ServerParser.parseServers(spec))

      expect(result.servers[0].description).toBeUndefined()
    })
  })

  describe('generateServersDoc', () => {
    it('should return undefined for no servers', () => {
      const parsed: ServerParser.ParsedServers = {
        servers: [],
      }

      const doc = ServerParser.generateServersDoc(parsed)

      expect(doc).toBeUndefined()
    })

    it('should generate doc for single server with description', () => {
      const parsed: ServerParser.ParsedServers = {
        servers: [{ url: 'https://api.example.com/v1', description: 'Production server' }],
        pathPrefix: '/v1',
      }

      const doc = ServerParser.generateServersDoc(parsed)

      expect(doc).toContain('Server URLs')
      expect(doc).toContain('https://api.example.com/v1 - Production server')
      expect(doc).toContain('Base path: /v1')
    })

    it('should generate doc for multiple servers', () => {
      const parsed: ServerParser.ParsedServers = {
        servers: [
          { url: 'https://api.example.com/v1', description: 'Production' },
          { url: 'https://staging.example.com/v1', description: 'Staging' },
          { url: 'http://localhost:3000/v1', description: 'Local' },
        ],
        pathPrefix: '/v1',
      }

      const doc = ServerParser.generateServersDoc(parsed)

      expect(doc).toContain('https://api.example.com/v1 - Production')
      expect(doc).toContain('https://staging.example.com/v1 - Staging')
      expect(doc).toContain('http://localhost:3000/v1 - Local')
    })

    it('should generate doc for server without description', () => {
      const parsed: ServerParser.ParsedServers = {
        servers: [{ url: 'https://api.example.com/v1' }],
      }

      const doc = ServerParser.generateServersDoc(parsed)

      expect(doc).toContain('* - https://api.example.com/v1')
      expect(doc).toContain('/**')
      expect(doc).toContain('Server URLs')
    })

    it('should generate doc without path prefix when not present', () => {
      const parsed: ServerParser.ParsedServers = {
        servers: [{ url: 'https://api.example.com', description: 'Production' }],
      }

      const doc = ServerParser.generateServersDoc(parsed)

      expect(doc).not.toContain('Base path:')
    })
  })
})
