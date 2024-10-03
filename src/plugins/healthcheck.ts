import fp from 'fastify-plugin'

export default fp(async (fastify) => {
  fastify.get('/__healthy', async (request, reply) => {
    return 'ok'
  })
})
