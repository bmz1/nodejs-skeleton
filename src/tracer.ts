import initTrace, { type Tracer } from '@ghostmonitor/lib-datadog-trace'

let datadog: Tracer | undefined
if (['staging', 'production'].includes(process.env.ENV!)) {
  datadog = initTrace()
  datadog.use('fastify', {
    blocklist: ['__healthy'],
    middleware: false
  })
}

export default datadog
