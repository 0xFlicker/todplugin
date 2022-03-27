import { format, createLogger, transports } from 'winston'
import { reduce } from 'ramda'

const reduceErrorProps = reduce((acc, [key, value]) => {
  if (key === 'stack') {
    acc[key] = value.split('\n')
  } else {
    acc[key] = value
  }
  return acc
}, {})

function replaceErrors(_: any, value: any) {
  if (value instanceof Buffer) {
    return value.toString('base64')
  } else if (value instanceof Error) {
    return reduceErrorProps(Object.getOwnPropertyNames(value).map(key => [key, value[key]]))
  }
  return value
}

export default createLogger({
  format: format.combine(format.json({ replacer: replaceErrors })),
  level: process.env.LEADERBOARD_LOG_LEVEL || 'debug',
  transports:
    process.env.DEPLOYMENT === 'local'
      ? [
          new transports.Console({
            format: format.combine(format.colorize(), format.simple())
          })
        ]
      : [new transports.Console()]
})
