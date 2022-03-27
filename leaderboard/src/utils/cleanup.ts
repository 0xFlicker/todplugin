import nodeCleanup from 'node-cleanup'
import logger from './debug'

const log = logger('ranker:cleanup')

const handlers: (() => void)[] = []

export function register(handler: () => void) {
  handlers.push(handler)
}

if (!process.env.FAST_EXIT) {
  nodeCleanup((exitCode, signal): boolean | void => {
    log(`Received exitCode: ${exitCode} signal: ${signal} and cleaning up`)
    Promise.all(handlers.map(h => Promise.resolve(h())))
      .then(
        () => log(`Succesfully cleaned up ${handlers.length} tasks`),
        err => log(`Error during cleanup`, err)
      )
      .then(() => process.kill(process.pid, signal || undefined))
    // Tell nodeCleanup that we will handle termination after async claenup
    nodeCleanup.uninstall()
    return false
  })
}
