/*
 * Converted to Typescript from https://github.com/laggingreflex/debounce-queue
 *
 * LICENSE: The Unlicense (public domain)
 *
 * Modifications:
 *  - Removed sleep option because I didn't understand or need it
 *  - Only supports a single argument (easier to type)
 *  - Converted usage of Date to numeric
 *  - Added promise support to be able to block on when a debounced execution occurs
 *  - Added abort w/ promise for clean shutdown
 *  - Added onEmpty listener for notifying when queue is cleared
 */
import ProgressBar from 'progress'
import logger from './debug'

const log = logger('trace:debounce')

const progress = process.env.DEBUG
  ? (() => {
      const bar = new ProgressBar('Processing (:current/:total) :rateops/s :elapseds', {
        complete: '=',
        incomplete: ' ',
        width: 20,
        total: 0
      })

      return {
        get total() {
          return bar.total
        },
        set total(_t: number) {
          bar.total = _t
        },
        tick(num?: number) {
          bar.tick(num)
        }
      }
    })()
  : false
export interface DebounceQueueOptions<G = any> {
  delay?: number
  maxDelay?: number
  maxSize?: number
  onEmpty?: Listener<G>
}

export type Listener<T> = (input: T) => any

type Resolver<T> = (value?: T) => void
type Rejector = (reason?: any) => void
export default function debounceQueue<T, G>(
  callback: (all: T[]) => Promise<G>,
  options?: DebounceQueueOptions<G>
): [(input: T) => Promise<G>, () => Promise<void>] {
  /*
   * Failfasts
   */
  if (typeof callback !== 'function') {
    throw new Error('Required: the function to debounce')
  }

  /*
   * Options
   */
  const opts = options ? options : {}
  const delay = opts.delay || 100
  const maxSize = opts.maxSize || Infinity
  const maxDelay = opts.maxDelay || Infinity
  const onEmpty = opts.onEmpty || null

  /*
   * Variables
   */
  let queue: [T, Resolver<G>, Rejector][] = [] // A spread of an item of work, and their promise defer
  let backlog: [T, Resolver<G>, Rejector][][] = []
  let working = false // True when work is being performed
  let time = Date.now() // Keeps track of if maxTime is being respected
  let emptyPromise: null | Promise<void> = null
  let emptyDefer: [] | [Resolver<void>, Rejector] = []

  function debounced(input: T) {
    return new Promise<G>((resolve, reject) => {
      if (queue.length >= maxSize) {
        backlog.push(queue)
        queue = []
      }
      queue.push([input, resolve, reject])
      if (progress) {
        progress.total += 1
      }
      if (time + maxDelay > Date.now()) {
        resetTimeout()
        timer = setTimeout(timeoutFn, 0)
      } else if (!working) {
        setNextTimer()
      }
    })
  }

  function timeoutFn() {
    const isBacklog = !!backlog.length
    const flush = (isBacklog ? (backlog.shift() as [T, Resolver<G>, Rejector][]) : queue).slice()
    queue = isBacklog ? queue : []
    log(`-> timeoutFn isBacklog: ${isBacklog} processing ${flush.length} items`)
    let ret
    if (flush.length) {
      working = true
      const abort = () => {
        if (emptyPromise && emptyDefer.length) {
          const [resolve] = emptyDefer
          emptyDefer = []
          emptyPromise = null
          resolve()
          return true
        }
        return false
      }
      ret = Promise.resolve(callback(flush.map(([t]) => t)))
        .then(async response => {
          if (onEmpty && queue.length === 0 && backlog.length === 0) {
            log('Queue empty and notifying onEmpty listner')
            await onEmpty(response)
          }
          if (progress) {
            progress.tick(flush.length)
          }
          return response
        })
        .then(
          result => {
            flush.forEach(([_, resolve]) => resolve(result))
            return result
          },
          error => {
            flush.forEach(([_, __, reject]) => reject(error))
            throw error
          }
        )
        .finally(() => {
          // Mark timestamp for checking max delay because maxDelay is the amount of time since last job _finished_
          time = Date.now()
          working = false
          abort()
          if (queue.length || backlog.length) {
            resetTimeout()
            timer = setTimeout(timeoutFn, 0)
          }
        })
    } else {
      working = false
    }

    return ret
  }

  let timer: NodeJS.Timeout | null = null
  const resetTimeout = () => {
    if (!timer) return
    clearTimeout(timer)
    timer = null
  }

  function setNextTimer() {
    resetTimeout()
    timer = setTimeout(timeoutFn, delay)
  }

  function empty() {
    if (!emptyPromise) {
      emptyPromise = new Promise((resolve, reject) => {
        if (queue.length !== 0 && backlog.length !== 0) {
          resolve()
        } else {
          emptyDefer = [resolve, reject]
        }
      })
    }
    return emptyPromise
  }

  return [debounced, empty]
}
