import { compose, unnest } from 'ramda'
import { DebounceQueueOptions } from './debounceQueue'
import createSchedule from '../utils/schedule'

export { DebounceQueueOptions }
export default function batched<T, G>(work: (input: T[]) => Promise<G>, debounceOptions?: DebounceQueueOptions<G>) {
  return createSchedule<T[], G>(
    compose(
      // 🚀️
      work,
      // flatten any batched work
      unnest
    ),
    debounceOptions
  )
}
