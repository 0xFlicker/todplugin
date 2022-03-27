import Enforcer from 'openapi-enforcer'
import schema from './leaderboard-openapi.json'

describe('leaderboard openapi', () => {
  it('Validates', async () => {
    const response = await Enforcer(schema, { fullResult: true })
    expect(response).toEqual(
      expect.objectContaining({
        error: undefined,
        warning: undefined,
        value: expect.objectContaining({
          components: expect.any(Object),
          info: expect.any(Object),
          openapi: expect.any(String),
          paths: expect.any(Object),
          servers: expect.any(Object)
        })
      })
    )
  })
})
