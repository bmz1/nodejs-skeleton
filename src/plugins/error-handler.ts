import { isHttpError } from '@ghostmonitor/lib-error'
import { type FastifyInstance, type FastifyPluginOptions } from 'fastify'
import fp from 'fastify-plugin'

function errorHandler(fastify: FastifyInstance, _: FastifyPluginOptions, done: (err?: Error) => void): void {
  fastify.setErrorHandler((error, _, reply) => {
    if (isHttpError(error)) {
      reply.status(error.statusCode)
      reply.send(error.toResponse())
    } else {
      reply.status(error?.statusCode || 500)
      reply.send(error.message)
    }
  })

  done()
}

export default fp(errorHandler, {
  name: 'fastify-error-handler'
})
