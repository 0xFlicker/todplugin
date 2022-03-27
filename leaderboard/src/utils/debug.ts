import debug from 'debug'

export default function(logName: string) {
  const logger = debug(logName)
  return (...logFuncOrStr: (any | (() => string))[]) => {
    if (logger.enabled) {
      // @ts-ignore
      logger(...logFuncOrStr.map(l => (typeof l === 'function' ? l() : l)))
    }
  }
}
