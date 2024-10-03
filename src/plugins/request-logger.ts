import { type FastifyInstance, type FastifyPluginOptions } from 'fastify'
import fp from 'fastify-plugin'

function requestLogger(
  fastify: FastifyInstance,
  _: FastifyPluginOptions,
  done: (err?: Error) => void
): void {
  fastify.addHook('onResponse', (request, reply, done) => {
    const ip = request.ip
    const method = request.method
    const url = request.routeOptions.url
    const statusCode = reply.statusCode
    const contentLength = reply.getHeader('content-length') || '-'
    const timestamp = new Date().toISOString()

    const msg = `${ip} - - [${timestamp}] "${method} %${
      url
    } HTTP/1.X" ${statusCode} ${contentLength}\n`

    // This should be reviewed
    // HTTP Logs are useful, but this way of logging it not.
    process.stdout.write(msg)

    done()
  })

  fastify.addHook('onError', (request, reply, error, done) => {
    const { method, url } = request
    const path = url
    const status = error.statusCode || reply.statusCode

    if (status === 404) {
      done()
    }

    if (status < 500) {
      fastify.logger.warn(`HTTP request failed - ${error.message}`, {
        error,
        status,
        method,
        path
      })
    } else {
      fastify.logger.error(`HTTP server error - ${error.message}`, {
        error,
        status,
        method,
        path
      })
    }

    done()
  })

  done()
}

export default fp(requestLogger, {
  name: 'fastify-request-logger'
})
