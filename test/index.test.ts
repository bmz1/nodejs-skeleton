import { createInternalServerError } from '@ghostmonitor/lib-error'
import logger from '@ghostmonitor/lib-logger'
import { expect } from 'chai'
import sinon from 'sinon'
import supertest from 'supertest'
import { App } from '../src/app'

function removeErrorListeners() {
  process.removeAllListeners('uncaughtException')
  process.removeAllListeners('unhandledRejection')
  process.removeAllListeners('SIGINT')
  process.removeAllListeners('SIGTERM')
}

describe('App', () => {
  let app: App
  let request: any
  const sandbox = sinon.createSandbox()

  beforeEach(async() => {
    app = new App({ serviceName: 'test-service' })
    request = supertest(app.instance.server)
  })

  afterEach(async () => {
    removeErrorListeners()
    sandbox.restore()
  })

  it('should create an instance of App', () => {
    expect(app).to.be.an.instanceOf(App)
  })

  it('should set up error handlers', () => {
    const processOn = sandbox.spy(process, 'on')
    removeErrorListeners()
    new App({ serviceName: 'test-service' })
    expect(processOn.calledWith('uncaughtException')).to.be.true
    expect(processOn.calledWith('unhandledRejection')).to.be.true
  })

  it('should set up shutdown listeners', () => {
    const processOn = sandbox.spy(process, 'on')
    removeErrorListeners()
    new App({ serviceName: 'test-service' })
    expect(processOn.calledWith('SIGINT')).to.be.true
    expect(processOn.calledWith('SIGTERM')).to.be.true
  })

  it('should add startup function', async () => {
    const startupFn = sandbox.stub().resolves()
    await app.registerPlugin(startupFn)
    await app.start(8080)
    expect(startupFn.calledOnce).to.be.true
    await app.instance.close()
  })

  it('should log on uncaught exception', async () => {
    const loggerError = sandbox.stub(logger, 'error')
    process.emit('uncaughtException', new Error('test'))
    expect(loggerError.calledOnce).to.be.true
  })

  it('should log on unhandledRejection', async () => {
    const loggerError = sandbox.stub(logger, 'error')
    // @ts-ignore
    process.emit('unhandledRejection', new Error('test'))
    expect(loggerError.calledOnce).to.be.true
  })

  it('should start the server', async () => {
    await app.start(8080)
    expect(app.instance.server.listening).to.be.true
    await app.instance.close()
  })

  it('should use default healthcheck', async () => {
    await app.start(8080)
    const response = await app.instance.inject({
      method: 'GET',
      url: '/__healthy'
    })
    expect(response.statusCode).to.equal(200)
    expect(response.payload).to.equal('ok')
    await app.instance.close()
  })
  
  it('should use default healthcheck', async () => {
    const healthcheckStub = sandbox.stub().returns('ok')
    app = new App({ serviceName: 'test-service', healthcheck: healthcheckStub })
    const response = await app.instance.inject({
      method: 'GET',
      url: '/__healthy'
    })
    expect(response.statusCode).to.equal(200)
    expect(healthcheckStub.calledOnce).to.be.true
    await app.instance.close()
  })

  it('should log warn', async () => {
    app.instance.get('/error', async () => {
      throw new Error('test')
    })

    await app.start(8080)
    const response = await app.instance.inject({
      method: 'GET',
      url: '/error'
    })
    expect(response.statusCode).to.equal(500)
    await app.instance.close()
  })

  it('should log error', async () => {
    app.instance.get('/error', async () => {
      throw createInternalServerError('Internal Server Error')
    })

    await app.start(8080)
    const response = await app.instance.inject({
      method: 'GET',
      url: '/error'
    })
    expect(response.statusCode).to.equal(500)
    await app.instance.close()
  })

  it('should call shutdown functions when terminating', async () => {
    const shutdownFn = sandbox.stub().resolves()
    app.instance.addHook('onClose', async () => {
      shutdownFn()
    })
    const processExit = sandbox.stub(process, 'exit')
    const clock = sandbox.useFakeTimers()
    await app.start(8080)

    // Simulate SIGTERM
    process.emit('SIGTERM')

    // Fast-forward time to trigger termination
    await clock.tickAsync(15000)

    // Fast-forward to allow all promises to resolve
    await clock.runAllAsync()

    expect(shutdownFn.calledOnce).to.be.true

    clock.restore()
    processExit.restore()
    await app.instance.close()
  })
})
