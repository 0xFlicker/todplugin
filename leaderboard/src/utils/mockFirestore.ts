import { Firestore } from '@google-cloud/firestore'
import set from 'lodash.set'
import get from 'lodash.get'
import mergeWith from 'lodash.mergewith'
import debug from './debug'

const log = debug('mock-firestore')

interface MockDataRef {
  exists: boolean
  data(): object
}

interface MockDocRef {
  set(data: object): Promise<void>
  get(): Promise<MockDataRef>
  delete(): Promise<void>
}

export function pathToStore(path: string) {
  return path.split('/').join('.')
}

export default function mockDb(): Firestore {
  const store = {}

  function mockDocRef(path: string): MockDocRef {
    function getWithPath(path: string) {
      return get(store, pathToStore(path), {
        get exists() {
          return false
        },
        data() {
          return undefined
        }
      })
    }
    const selfie = {
      async set(data: object) {
        log(() => `Setting ${pathToStore(path)} to ${JSON.stringify(data)}`)
        const oldDataRef = <MockDataRef>getWithPath(path)
        const oldData = oldDataRef.exists ? oldDataRef.data() : {}
        const newData = mergeWith(oldData, data, (_, srcValue) => {
          if (Array.isArray(srcValue)) {
            return srcValue
          }
          return undefined
        })
        set(store, pathToStore(path), {
          ...oldDataRef,
          get exists() {
            return true
          },
          data() {
            return newData
          },
          toJSON() {
            return {
              ...Object.entries(this).reduce((memo, [key, value]) => {
                if (key !== 'exists') {
                  if (key === 'data') {
                    // @ts-ignore
                    Object.assign(memo, value())
                  } else {
                    memo[key] = value
                  }
                }
                return memo
              }, {}),
              ...this.data
            }
          }
        })
        return Promise.resolve()
      },
      async delete() {
        set(store, pathToStore(path), {
          get exists() {
            return false
          },
          data() {
            throw new Error('no data')
          }
        })
      },
      async get() {
        const ret = getWithPath(path)
        log(() => `Getting ${pathToStore(path)} => ${ret.exists ? JSON.stringify(getWithPath(path)) : 'exists: false'}`)
        return Promise.resolve(ret)
      }
    }
    return selfie
  }
  return <Firestore>(<unknown>{
    get store() {
      return store
    },
    doc(path: string) {
      log(() => `Requesting doc ${path}`)
      return mockDocRef(path)
    },
    async getAll(...refs: MockDocRef[]) {
      return Promise.all(refs.map(r => r.get()))
    },
    batch() {
      const operations: (() => Promise<void>)[] = []
      return {
        set(ref: MockDocRef, data: object) {
          operations.push(() => ref.set(data))
        },
        delete(ref: MockDocRef) {
          operations.push(() => ref.delete())
        },
        async commit() {
          await Promise.all(operations.map(o => o()))
        }
      }
    }
  })
}
