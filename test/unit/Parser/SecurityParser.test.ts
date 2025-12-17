import { describe, expect, it } from '@effect/vitest'
import * as Effect from 'effect/Effect'
import type * as OpenApiParser from '../../../src/Parser/OpenApiParser.js'
import * as SecurityParser from '../../../src/Parser/SecurityParser.js'

describe('SecurityParser', () => {
  describe('parseSecuritySchemes', () => {
    it('should return empty map when no securitySchemes defined', () =>
      Effect.gen(function* () {
        const result = yield* SecurityParser.parseSecuritySchemes(undefined)
        expect(result.size).toBe(0)
      }))

    it('should parse apiKey scheme with header location', () =>
      Effect.gen(function* () {
        const components: OpenApiParser.ComponentsObject = {
          securitySchemes: {
            apiKeyAuth: {
              type: 'apiKey',
              name: 'X-API-Key',
              in: 'header',
              description: 'API key in header',
            },
          },
        }

        const result = yield* SecurityParser.parseSecuritySchemes(components)

        expect(result.size).toBe(1)
        const scheme = result.get('apiKeyAuth')
        expect(scheme).toEqual({
          type: 'apiKey',
          name: 'X-API-Key',
          in: 'header',
          description: 'API key in header',
        })
      }))

    it('should parse apiKey scheme with query location', () =>
      Effect.gen(function* () {
        const components: OpenApiParser.ComponentsObject = {
          securitySchemes: {
            apiKeyQuery: {
              type: 'apiKey',
              name: 'api_key',
              in: 'query',
            },
          },
        }

        const result = yield* SecurityParser.parseSecuritySchemes(components)

        const scheme = result.get('apiKeyQuery')
        expect(scheme?.type).toBe('apiKey')
        expect(scheme?.type === 'apiKey' ? scheme.in : undefined).toBe('query')
        expect(scheme?.type === 'apiKey' ? scheme.name : undefined).toBe('api_key')
      }))

    it('should parse apiKey scheme with cookie location', () =>
      Effect.gen(function* () {
        const components: OpenApiParser.ComponentsObject = {
          securitySchemes: {
            apiKeyCookie: {
              type: 'apiKey',
              name: 'session_token',
              in: 'cookie',
            },
          },
        }

        const result = yield* SecurityParser.parseSecuritySchemes(components)

        const scheme = result.get('apiKeyCookie')
        expect(scheme?.type === 'apiKey' ? scheme.in : undefined).toBe('cookie')
      }))

    it('should fail when apiKey scheme missing name', () =>
      Effect.gen(function* () {
        const components: OpenApiParser.ComponentsObject = {
          securitySchemes: {
            // @ts-expect-error - Testing invalid scheme missing required 'name' field
            apiKeyAuth: {
              type: 'apiKey',
              in: 'header',
            },
          },
        }

        const result = yield* Effect.flip(SecurityParser.parseSecuritySchemes(components))

        expect(result._tag).toBe('SecurityParseError')
        expect(result.message).toContain('missing required fields')
      }))

    it('should parse http bearer scheme', () =>
      Effect.gen(function* () {
        const components: OpenApiParser.ComponentsObject = {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
              description: 'Bearer token',
            },
          },
        }

        const result = yield* SecurityParser.parseSecuritySchemes(components)

        const scheme = result.get('bearerAuth')
        expect(scheme).toEqual({
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Bearer token',
        })
      }))

    it('should parse http basic scheme', () =>
      Effect.gen(function* () {
        const components: OpenApiParser.ComponentsObject = {
          securitySchemes: {
            basicAuth: {
              type: 'http',
              scheme: 'basic',
            },
          },
        }

        const result = yield* SecurityParser.parseSecuritySchemes(components)

        const scheme = result.get('basicAuth')
        expect(scheme?.type).toBe('http')
        expect(scheme?.type === 'http' ? scheme.scheme : undefined).toBe('basic')
      }))

    it('should fail when http scheme missing scheme field', () =>
      Effect.gen(function* () {
        const components: OpenApiParser.ComponentsObject = {
          securitySchemes: {
            // @ts-expect-error - Testing invalid scheme missing required 'scheme' field
            httpAuth: {
              type: 'http',
            },
          },
        }

        const result = yield* Effect.flip(SecurityParser.parseSecuritySchemes(components))

        expect(result._tag).toBe('SecurityParseError')
        expect(result.message).toContain("missing 'scheme' field")
      }))

    it('should parse oauth2 authorization code flow', () =>
      Effect.gen(function* () {
        const components: OpenApiParser.ComponentsObject = {
          securitySchemes: {
            oauth2: {
              type: 'oauth2',
              flows: {
                authorizationCode: {
                  authorizationUrl: 'https://example.com/oauth/authorize',
                  tokenUrl: 'https://example.com/oauth/token',
                  refreshUrl: 'https://example.com/oauth/refresh',
                  scopes: {
                    'read:users': 'Read users',
                    'write:users': 'Write users',
                  },
                },
              },
            },
          },
        }

        const result = yield* SecurityParser.parseSecuritySchemes(components)

        const scheme = result.get('oauth2') as SecurityParser.OAuth2SecurityScheme
        expect(scheme.type).toBe('oauth2')
        expect(scheme.flows.authorizationCode).toBeDefined()
        expect(scheme.flows.authorizationCode?.authorizationUrl).toBe('https://example.com/oauth/authorize')
        expect(scheme.flows.authorizationCode?.tokenUrl).toBe('https://example.com/oauth/token')
        expect(scheme.flows.authorizationCode?.scopes).toEqual({
          'read:users': 'Read users',
          'write:users': 'Write users',
        })
      }))

    it('should parse oauth2 client credentials flow', () =>
      Effect.gen(function* () {
        const components: OpenApiParser.ComponentsObject = {
          securitySchemes: {
            oauth2: {
              type: 'oauth2',
              flows: {
                clientCredentials: {
                  tokenUrl: 'https://example.com/oauth/token',
                  scopes: {
                    'api:access': 'API access',
                  },
                },
              },
            },
          },
        }

        const result = yield* SecurityParser.parseSecuritySchemes(components)

        const scheme = result.get('oauth2') as SecurityParser.OAuth2SecurityScheme
        expect(scheme.flows.clientCredentials).toBeDefined()
        expect(scheme.flows.clientCredentials?.tokenUrl).toBe('https://example.com/oauth/token')
      }))

    it('should fail when oauth2 scheme missing flows', () =>
      Effect.gen(function* () {
        const components: OpenApiParser.ComponentsObject = {
          securitySchemes: {
            // @ts-expect-error - Testing invalid scheme missing required 'flows' field
            oauth2: {
              type: 'oauth2',
            },
          },
        }

        const result = yield* Effect.flip(SecurityParser.parseSecuritySchemes(components))

        expect(result._tag).toBe('SecurityParseError')
        expect(result.message).toContain("missing 'flows' field")
      }))

    it('should parse openIdConnect scheme', () =>
      Effect.gen(function* () {
        const components: OpenApiParser.ComponentsObject = {
          securitySchemes: {
            openId: {
              type: 'openIdConnect',
              openIdConnectUrl: 'https://example.com/.well-known/openid-configuration',
              description: 'OpenID Connect',
            },
          },
        }

        const result = yield* SecurityParser.parseSecuritySchemes(components)

        const scheme = result.get('openId')
        expect(scheme).toEqual({
          type: 'openIdConnect',
          openIdConnectUrl: 'https://example.com/.well-known/openid-configuration',
          description: 'OpenID Connect',
        })
      }))

    it('should fail when openIdConnect scheme missing URL', () =>
      Effect.gen(function* () {
        const components: OpenApiParser.ComponentsObject = {
          securitySchemes: {
            // @ts-expect-error - Testing invalid scheme missing required 'openIdConnectUrl' field
            openId: {
              type: 'openIdConnect',
            },
          },
        }

        const result = yield* Effect.flip(SecurityParser.parseSecuritySchemes(components))

        expect(result._tag).toBe('SecurityParseError')
        expect(result.message).toContain("missing 'openIdConnectUrl' field")
      }))

    it('should parse multiple security schemes', () =>
      Effect.gen(function* () {
        const components: OpenApiParser.ComponentsObject = {
          securitySchemes: {
            apiKey: {
              type: 'apiKey',
              name: 'X-API-Key',
              in: 'header',
            },
            bearer: {
              type: 'http',
              scheme: 'bearer',
            },
            oauth2: {
              type: 'oauth2',
              flows: {
                authorizationCode: {
                  authorizationUrl: 'https://example.com/oauth/authorize',
                  tokenUrl: 'https://example.com/oauth/token',
                  scopes: {},
                },
              },
            },
          },
        }

        const result = yield* SecurityParser.parseSecuritySchemes(components)

        expect(result.size).toBe(3)
        expect(result.get('apiKey')?.type).toBe('apiKey')
        expect(result.get('bearer')?.type).toBe('http')
        expect(result.get('oauth2')?.type).toBe('oauth2')
      }))
  })

  describe('parseSecurityRequirements', () => {
    it('should return empty array when no security requirements', () => {
      const result = SecurityParser.parseSecurityRequirements(undefined)
      expect(result).toEqual([])
    })

    it('should parse single security requirement', () => {
      const security = [{ apiKeyAuth: [] }]

      const result = SecurityParser.parseSecurityRequirements(security)

      expect(result).toEqual([{ apiKeyAuth: [] }])
    })

    it('should parse security requirement with scopes', () => {
      const security = [{ oauth2: ['read:users', 'write:users'] }]

      const result = SecurityParser.parseSecurityRequirements(security)

      expect(result).toEqual([{ oauth2: ['read:users', 'write:users'] }])
    })

    it('should parse multiple alternative security requirements (OR)', () => {
      const security = [{ apiKey: [] }, { bearer: [] }]

      const result = SecurityParser.parseSecurityRequirements(security)

      expect(result.length).toBe(2)
      expect(result[0]).toEqual({ apiKey: [] })
      expect(result[1]).toEqual({ bearer: [] })
    })

    it('should parse combined security requirements (AND)', () => {
      const security = [{ apiKey: [], bearer: [] }]

      const result = SecurityParser.parseSecurityRequirements(security)

      expect(result.length).toBe(1)
      expect(result[0]).toEqual({ apiKey: [], bearer: [] })
    })
  })

  describe('parseSecurity', () => {
    it('should parse complete security configuration', () =>
      Effect.gen(function* () {
        const spec: OpenApiParser.OpenApiSpec = {
          openapi: '3.1.0',
          info: { title: 'Test', version: '1.0.0' },
          paths: {},
          security: [{ apiKeyAuth: [] }],
          components: {
            securitySchemes: {
              apiKeyAuth: {
                type: 'apiKey',
                name: 'X-API-Key',
                in: 'header',
              },
            },
          },
        }

        const result = yield* SecurityParser.parseSecurity(spec)

        expect(result.schemes.size).toBe(1)
        expect(result.globalRequirements).toEqual([{ apiKeyAuth: [] }])
      }))
  })
})
