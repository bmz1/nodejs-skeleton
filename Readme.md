
# App-skeleton

This is a Fastify-based web server with Datadog tracing, custom health checks, and service shutdown management. The app is designed to run with robust error handling and graceful shutdown mechanisms.
[Core-lib migration guide](https://www.notion.so/recart/App-skeleton-migration-guide-8177e28eba264e4c8b995f014552afbc#8d73e49058c6489e96fe1cf4d5842738)

## Features

- **Fastify-based Server:** Built on top of Fastify for high-performance.
- **Datadog Tracing:** Integration with Datadog to trace requests, including automatic tag setup for specific environments.
- **Health Check Endpoint:** Customizable health check (`/__healthy`) to monitor the application's health.
- **Graceful Shutdown:** Support for graceful shutdown during application termination with connection draining.
- **Error Handling:** Centralized error handling for uncaught exceptions and unhandled rejections.
- **Request Logging:** Integrated request logger for monitoring incoming requests.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Plugins](#plugins)
- [Custom Health Check](#custom-health-check)
- [Graceful Shutdown](#graceful-shutdown)
- [API Reference](#api-reference)

## Installation

```bash
npm install @ghostmonitor/app-skeleton
```

## Quick Start

Here's a simple example of how to use BaseServer:

```typescript
import { App } from '@ghostmonitor/app-skeleton';

async function startServer() {
  const server = new App({ serviceName: 'my-service' });

  // Register routes
  server.registerRoutes([
    {
      method: 'GET',
      url: '/hello',
      handler: async (request, reply) => {
        reply.send({ message: 'Hello, World!' });
      }
    }
  ]);

  // Start the server
  await server.start(8080);
}

startServer().catch(console.error);
```

## Configuration

The app can be configured using environment variables:

- `ENV`: Specifies the environment (`development`, `staging`, `production`). Tracing is enabled only for `staging` and `production`.
- `PORT`: Port number the server listens on. Defaults to `8080` if not specified.
- `APP_PORT`: Alternative port variable if `PORT` is not set.

## Plugins

The server is designed to be extendable with plugins. Some core plugins are already registered by default, like:

- `./plugins/error-handler`: Centralized error handling.
- `./plugins/request-logger`: Logs incoming requests.

You can register additional plugins using the `registerPlugin` method:

```typescript
const plugin = async (fastify) => { /* plugin logic */ };
await app.registerPlugin(plugin);
```

## Custom Health Check

You can provide a custom health check by passing a `healthcheck` handler when initializing the `App` class or later via `setHealthCheck`.

Example:

```typescript
const healthcheck: HealthCheckHandler = async (request, reply) => {
  // Custom health check logic
  reply.send('ok');
};

const app = new App({ serviceName: 'my-service', healthcheck });
```

Alternatively, a default health check plugin will be registered if no custom handler is provided.

## Graceful Shutdown

The server handles graceful shutdown on receiving `SIGINT` or `SIGTERM` signals. It waits for in-progress requests to complete before shutting down.

- During shutdown, the server responds with `503 Service Unavailable` to any new incoming requests.
- There is a configurable delay before termination to allow ongoing requests to complete (default is 15 seconds).

## Logging

The application uses a custom logger (`@ghostmonitor/lib-logger`). You can access this logger within the Fastify instance using `fastify.logger`:

```typescript
fastify.logger.info('Custom log message');
```

## API Reference

### `App` Class

#### Constructor

```typescript
constructor(options: AppOptions)
```

- `serviceName` (string): Name of the service.
- `port` (optional, number): Port number for the server.
- `fastifyOptions` (optional, FastifyServerOptions): Options passed to the Fastify instance.
- `healthcheck` (optional, HealthCheckHandler): Custom health check function.

#### Methods

##### `registerPlugin(plugin: FastifyPluginAsync | FastifyPluginCallback, options?: any): Promise<void>`

Registers a Fastify plugin.

- `plugin`: The Fastify plugin to register.
- `options`: Additional options to pass to the plugin.

##### `setHealthCheck(handler: HealthCheckHandler): void`

Sets a custom health check handler.

- `handler`: The function that handles health check requests.

##### `registerRoute(routeDefinition: RouteDefinition): void`

Registers a single route for the Fastify instance.

- `routeDefinition`: Object with `method`, `url`, `handler`, and optional `schema`.

##### `registerRoutes(routeDefinitions: RouteDefinition[]): void`

Registers multiple routes at once.

- `routeDefinitions`: Array of route definitions (objects with `method`, `url`, `handler`, and optional `schema`).

##### `start(port?: number): Promise<void>`

Starts the Fastify server on the specified port or default port `8080`.

- `port`: Optional port number.

#### Properties

##### `instance: FastifyInstance`

Returns the Fastify instance.

#### `AppOptions` Interface

- `serviceName`: Name of the service.
- `port`: Optional port number.
- `fastifyOptions`: Optional Fastify server options.
- `healthcheck`: Optional custom health check function.

#### `RouteDefinition` Interface

- `method`: HTTP method or array of methods.
- `url`: Route URL.
- `handler`: Route handler function.
- `schema`: Optional Fastify schema for request validation.

