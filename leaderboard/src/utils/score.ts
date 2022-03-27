/**
 * compares number[] < number[]
 *
 * Arrays are compared 0 index first. If the values are equal, then the next index is
 * compared. If all numbers are equal, then returns false. Otherwise return the result
 * of left[index] < right[index]
 *
 * @param left left hand score
 * @param right right hand score
 *
 * @returns true if the left number[] is less than right number[]
 */
export function scoreLT(left: number[], right: number[]) {
  return scoreSort(left, right) > 0
}

/**
 * compares number[] > number[]
 *
 * Arrays are compared 0 index first. If the values are equal, then the next index is
 * compared. If all numbers are equal, then returns false. Otherwise return the result
 * of left[index] > right[index]
 *
 * @param left left hand score
 * @param right right hand score
 *
 * @returns true if the left number[] is greater than right number[]
 */
export function scoreGT(left: number[], right: number[]) {
  return scoreSort(left, right) < 0
}

/**
 * Sort function for returning highest first
 * @param left
 * @param right
 */
export function scoreSort(left: number[], right: number[]) {
  if (left.length !== right.length) {
    throw new Error(`Lengths must match instead got [${left.join(',')}] and [${right.join(',')}]`)
  }
  for (let i = 0; i <= left.length; i++) {
    if (left[i] > right[i]) {
      return -1
    } else if (left[i] < right[i]) {
      return 1
    }
  }
  return 0
}
