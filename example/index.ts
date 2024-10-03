import { App } from '../src/app'
import healthcheck from '../src/plugins/healthcheck'
import requestLogger from '../src/plugins/request-logger'

async function start(): Promise<void> {
  const app = new App({ serviceName: 'example' })

  app.registerRoute({
    method: 'GET',
    url: '/__healthy',
    handler: async (request, reply) => {
      return 'ok'
    }
  })

  await app.registerPlugin(requestLogger)

  await app.start(3000)
}

start().catch((error) => {
  console.error(error)
  process.exit(1)
})
