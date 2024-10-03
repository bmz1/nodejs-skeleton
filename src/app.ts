import datadog from './tracer'
import Fastify, {
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
  type RouteOptions,
  type HTTPMethods,
  FastifyPluginCallback,
  FastifyPluginAsync,
  FastifySchema,
  FastifyServerOptions
} from 'fastify'
import os from 'os'
import logger from '@ghostmonitor/lib-logger'

// Extend FastifyInstance to include custom logger
declare module 'fastify' {
  interface FastifyInstance {
    logger: typeof logger
  }
}

type HealthCheckHandler = (request: FastifyRequest, reply: FastifyReply) => Promise<void>

interface RouteDefinition {
  method: HTTPMethods | HTTPMethods[]
  url: string
  handler: RouteOptions['handler']
  schema?: RouteOptions['schema']
}

export interface AppOptions {
  serviceName: string
  port?: number
  fastifyOptions?: FastifyServerOptions
  healthcheck?: HealthCheckHandler
}

export class App {
  private fastify: FastifyInstance
  private isTerminated: boolean
  private readonly serviceName: string
  private healthcheck?: HealthCheckHandler
  private readonly TERMINATION_DELAY_IN_SECONDS = 15

  constructor(options: AppOptions) {
    this.serviceName = options.serviceName
    this.healthcheck = options.healthcheck
    this.isTerminated = false
    this.fastify = Fastify({
      bodyLimit: 10 * 1024 * 1024,
      ...options.fastifyOptions,
    })

    this.setupServer()
  }

  private setupServer(): void {
    this.setupTracing()
    this.decorateFastify()
    this.registerCorePlugins()
    this.setupHealthCheck()
    this.setupUncaughtErrorHandlers()
    this.setupShutdownListeners()
    this.addServiceTerminationCheck()
  }

  private setupTracing(): void {
    const envList = ['staging', 'production']
    const env = process.env.ENV as string
    this.fastify.addHook('onRequest', (request, _, done) => {
      const span = datadog?.scope().active()
      if (envList.includes(env) && span) {
        span.setTag('resource.name', `${request.method} ${request.routeOptions.url}`)
      }
      done()
    })
  }

  private decorateFastify(): void {
    this.fastify.decorate('logger', logger)
  }

  private registerCorePlugins(): void {
    this.fastify.register(import('./plugins/error-handler'))
    this.fastify.register(import('./plugins/request-logger'))
  }

  private setupHealthCheck(): void {
    if (this.healthcheck) {
      this.fastify.get('/__healthy', this.healthcheck)
    } else {
      this.fastify.register(import('./plugins/healthcheck'))
    }
  }

  private setupUncaughtErrorHandlers(): void {
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', { error })
    })

    process.on('unhandledRejection', (error) => {
      logger.error('Unhandled rejection', { error })
    })
  }

  private addServiceTerminationCheck(): void {
    this.fastify.addHook('onRequest', async (_, reply) => {
      if (this.isTerminated) {
        reply.code(503).header('Connection', 'close').send('Service Unavailable')
      }
    })
  }

  private setupShutdownListeners(): void {
    ;['SIGINT', 'SIGTERM'].forEach((signal) => {
      process.on(signal, async () => {
        await this.delayTermination()
        await this.fastify.close()
        process.exit(0)
      })
    })
  }

  private async delayTermination(): Promise<void> {
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        logger.info('Shutting down connections')
        this.isTerminated = true
        resolve()
      }, this.TERMINATION_DELAY_IN_SECONDS * 1000)
    })
  }

  private getServerConfig(): Record<string, unknown> {
    return {
      serviceName: this.serviceName,
      environment: process.env.ENV,
      hostname: os.hostname(),
      nodeVersion: process.version,
      port: process.env.PORT ?? process.env.APP_PORT
    }
  }

  public get instance(): FastifyInstance {
    return this.fastify
  }

  public async registerPlugin(
    plugin: FastifyPluginAsync | FastifyPluginCallback,
    options?: any
  ): Promise<void> {
    await this.fastify.register(plugin, options)
  }

  public setHealthCheck(handler: HealthCheckHandler): void {
    this.healthcheck = handler
  }

  public registerRoute(routeDefinition: RouteDefinition): void {
    const { method, url, handler, schema } = routeDefinition
    this.fastify.route({ method, url, handler, schema })
  }

  public registerRoutes(routeDefinitions: RouteDefinition[]): void {
    routeDefinitions.forEach((routeDefinition) => {
      this.registerRoute(routeDefinition)
    })
  }

  public async start(port = 8080): Promise<void> {
    await this.fastify.listen({
      port,
      host: '0.0.0.0'
    })
    logger.info(`Server listening on port ${port}`, this.getServerConfig())
  }
}

export { FastifyInstance, FastifyRequest, FastifyReply, FastifyPluginAsync, FastifyPluginCallback, FastifySchema }
export { default as fp } from 'fastify-plugin'
export { datadog }
