export interface SortStep {
  array: number[]
  comparing: number[]
  swapped?: boolean
  operations: number
  comparisons: number
  note?: string
  stepType?: 'compare' | 'swap' | 'write' | 'copy' | 'pivot' | 'done'
  pivotIndex?: number
  pivotValue?: number
  activeRange?: [number, number]
  writeIndex?: number
}

export interface SortMetrics {
  startTime: number
  endTime?: number
  totalTime?: number
  comparisons: number
  swaps: number
  arrayAccesses: number
}

export interface SortExecutionControl {
  shouldPause?: () => boolean
  shouldStop?: () => boolean
  getSpeed?: () => number
}

export class SortAbortedError extends Error {
  constructor() {
    super('Sort aborted')
    this.name = 'SortAbortedError'
  }
}

async function waitForControl(
  speed: number,
  control?: SortExecutionControl,
  stepType?: SortStep['stepType']
) {
  let elapsed = 0

  while (true) {
    const liveSpeed = control?.getSpeed?.() ?? speed
    const delay = speedToDelayMs(liveSpeed, stepType)

    if (elapsed >= delay) {
      break
    }

    while (control?.shouldPause?.()) {
      if (control?.shouldStop?.()) {
        throw new SortAbortedError()
      }

      await sleep(20)
    }

    if (control?.shouldStop?.()) {
      throw new SortAbortedError()
    }

    const slice = Math.min(16, delay - elapsed)
    await sleep(slice)
    elapsed += slice
  }

  while (control?.shouldPause?.()) {
    if (control?.shouldStop?.()) {
      throw new SortAbortedError()
    }

    await sleep(20)
  }

  if (control?.shouldStop?.()) {
    throw new SortAbortedError()
  }
}

export function speedToDelayMs(speed: number, stepType?: SortStep['stepType']) {
  // Values above the UI range (1-100) are used for benchmark mode with no animation delay.
  if (speed > 100) {
    return 0
  }

  const clampedSpeed = Math.max(1, Math.min(100, speed))
  const normalized = (clampedSpeed - 1) / 99
  const slowestDelay = 900
  const fastestDelay = 8
  const eased = (1 - normalized) ** 2

  const baseDelay = Math.round(fastestDelay + eased * (slowestDelay - fastestDelay))

  switch (stepType) {
    case 'swap':
    case 'pivot':
      return Math.round(baseDelay * 1.2)
    case 'write':
    case 'copy':
      return Math.round(baseDelay * 1.1)
    default:
      return baseDelay
  }
}

export function isSortAbortedError(error: unknown): error is SortAbortedError {
  return error instanceof SortAbortedError
}

// Bubble Sort with step tracking
export async function bubbleSort(
  array: number[],
  onStep: (step: SortStep) => void,
  speed: number = 50,
  control?: SortExecutionControl
) {
  const arr = [...array]
  let comparisons = 0
  let operations = 0
  const n = arr.length

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      const leftValue = arr[j]
      const rightValue = arr[j + 1]

      comparisons++
      operations++

      onStep({
        array: [...arr],
        comparing: [j, j + 1],
        swapped: false,
        operations,
        comparisons,
        note: `Compare ${leftValue} and ${rightValue}.`,
        stepType: 'compare',
        activeRange: [j, j + 1],
      })

      await waitForControl(speed, control, 'compare')

      if (leftValue > rightValue) {
        // Swap
        ;[arr[j], arr[j + 1]] = [arr[j + 1], arr[j]]
        operations += 3 // 3 operations for swap

        onStep({
          array: [...arr],
          comparing: [j, j + 1],
          swapped: true,
          operations,
          comparisons,
          note: `Swap ${leftValue} and ${rightValue} because ${leftValue} is greater.`,
          stepType: 'swap',
          activeRange: [j, j + 1],
        })

        await waitForControl(speed, control, 'swap')
      }
    }
  }

  return { array: arr, comparisons, operations }
}

// Quick Sort with step tracking
export async function quickSort(
  array: number[],
  onStep: (step: SortStep) => void,
  speed: number = 50,
  control?: SortExecutionControl
) {
  const arr = [...array]
  let comparisons = 0
  let operations = 0

  async function partition(low: number, high: number): Promise<number> {
    const pivot = arr[high]
    let i = low - 1

    for (let j = low; j < high; j++) {
      const currentValue = arr[j]

      comparisons++
      operations++

      onStep({
        array: [...arr],
        comparing: [j, high],
        swapped: false,
        operations,
        comparisons,
        note: `Compare ${currentValue} with pivot ${pivot}.`,
        stepType: 'compare',
        pivotIndex: high,
        pivotValue: pivot,
        activeRange: [low, high],
      })

      await waitForControl(speed, control, 'compare')

      if (currentValue < pivot) {
        i++
        const leftValue = arr[i]

        ;[arr[i], arr[j]] = [arr[j], arr[i]]
        operations += 3

        onStep({
          array: [...arr],
          comparing: [i, j],
          swapped: true,
          operations,
          comparisons,
          note:
            i === j
              ? `${currentValue} is already in the left partition.`
              : `Move ${currentValue} left of pivot by swapping with ${leftValue}.`,
          stepType: 'swap',
          pivotIndex: high,
          pivotValue: pivot,
          activeRange: [low, high],
        })

        await waitForControl(speed, control, 'swap')
      }
    }

    const pivotTargetIndex = i + 1
    const displacedValue = arr[pivotTargetIndex]

    ;[arr[pivotTargetIndex], arr[high]] = [arr[high], arr[pivotTargetIndex]]
    operations += 3

    onStep({
      array: [...arr],
      comparing: [pivotTargetIndex, high],
      swapped: true,
      operations,
      comparisons,
      note:
        pivotTargetIndex === high
          ? `Pivot ${pivot} is already in its final position.`
          : `Place pivot ${pivot} at index ${pivotTargetIndex} by swapping with ${displacedValue}.`,
      stepType: 'pivot',
      pivotIndex: pivotTargetIndex,
      pivotValue: pivot,
      activeRange: [low, high],
    })

    await waitForControl(speed, control, 'pivot')
    return pivotTargetIndex
  }

  async function quickSortHelper(low: number, high: number): Promise<void> {
    if (low < high) {
      const pi = await partition(low, high)
      await quickSortHelper(low, pi - 1)
      await quickSortHelper(pi + 1, high)
    }
  }

  await quickSortHelper(0, arr.length - 1)
  return { array: arr, comparisons, operations }
}

// Merge Sort with step tracking
export async function mergeSort(
  array: number[],
  onStep: (step: SortStep) => void,
  speed: number = 50,
  control?: SortExecutionControl
) {
  const arr = [...array]
  let comparisons = 0
  let operations = 0

  async function merge(
    left: number,
    mid: number,
    right: number
  ): Promise<void> {
    const leftArr = arr.slice(left, mid + 1)
    const rightArr = arr.slice(mid + 1, right + 1)

    let i = 0,
      j = 0,
      k = left

    while (i < leftArr.length && j < rightArr.length) {
      const leftIndex = left + i
      const rightIndex = mid + 1 + j
      const leftValue = leftArr[i]
      const rightValue = rightArr[j]

      comparisons++
      operations++

      onStep({
        array: [...arr],
        comparing: [],
        swapped: false,
        operations,
        comparisons,
        note: `Compare ${leftValue} and ${rightValue} while merging partitions.`,
        stepType: 'compare',
        activeRange: [left, right],
      })

      await waitForControl(speed, control, 'compare')

      const shouldTakeLeft = leftValue <= rightValue
      const valueToWrite = shouldTakeLeft ? leftValue : rightValue

      arr[k] = valueToWrite
      operations++

      onStep({
        array: [...arr],
        comparing: [k],
        swapped: true,
        operations,
        comparisons,
        note: `Write ${valueToWrite} to index ${k}.`,
        stepType: 'write',
        writeIndex: k,
        activeRange: [left, right],
      })

      await waitForControl(speed, control, 'write')

      if (shouldTakeLeft) {
        i++
      } else {
        j++
      }

      k++
    }

    while (i < leftArr.length) {
      const valueToWrite = leftArr[i]
      arr[k] = valueToWrite
      operations++

      onStep({
        array: [...arr],
        comparing: [k],
        swapped: true,
        operations,
        comparisons,
        note: `Copy remaining ${valueToWrite} to index ${k}.`,
        stepType: 'copy',
        writeIndex: k,
        activeRange: [left, right],
      })

      await waitForControl(speed, control, 'copy')

      i++
      k++
    }

    while (j < rightArr.length) {
      const valueToWrite = rightArr[j]
      arr[k] = valueToWrite
      operations++

      onStep({
        array: [...arr],
        comparing: [k],
        swapped: true,
        operations,
        comparisons,
        note: `Copy remaining ${valueToWrite} to index ${k}.`,
        stepType: 'copy',
        writeIndex: k,
        activeRange: [left, right],
      })

      await waitForControl(speed, control, 'copy')

      j++
      k++
    }
  }

  async function mergeSortHelper(
    left: number,
    right: number
  ): Promise<void> {
    if (left < right) {
      const mid = Math.floor((left + right) / 2)
      await mergeSortHelper(left, mid)
      await mergeSortHelper(mid + 1, right)
      await merge(left, mid, right)
    }
  }

  await mergeSortHelper(0, arr.length - 1)
  return { array: arr, comparisons, operations }
}

// Selection Sort with step tracking
export async function selectionSort(
  array: number[],
  onStep: (step: SortStep) => void,
  speed: number = 50,
  control?: SortExecutionControl
) {
  const arr = [...array]
  let comparisons = 0
  let operations = 0

  for (let i = 0; i < arr.length - 1; i++) {
    let minIndex = i

    for (let j = i + 1; j < arr.length; j++) {
      const candidate = arr[j]
      const currentMin = arr[minIndex]

      comparisons++
      operations++

      onStep({
        array: [...arr],
        comparing: [minIndex, j],
        swapped: false,
        operations,
        comparisons,
        note: `Compare ${candidate} with current minimum ${currentMin}.`,
        stepType: 'compare',
        activeRange: [i, arr.length - 1],
      })

      await waitForControl(speed, control, 'compare')

      if (candidate < currentMin) {
        minIndex = j
      }
    }

    if (minIndex !== i) {
      const leftValue = arr[i]
      const rightValue = arr[minIndex]

      ;[arr[i], arr[minIndex]] = [arr[minIndex], arr[i]]
      operations += 3

      onStep({
        array: [...arr],
        comparing: [i, minIndex],
        swapped: true,
        operations,
        comparisons,
        note: `Swap ${leftValue} and ${rightValue} to place the next minimum.`,
        stepType: 'swap',
        activeRange: [i, arr.length - 1],
      })

      await waitForControl(speed, control, 'swap')
    }
  }

  return { array: arr, comparisons, operations }
}

// Insertion Sort with step tracking
export async function insertionSort(
  array: number[],
  onStep: (step: SortStep) => void,
  speed: number = 50,
  control?: SortExecutionControl
) {
  const arr = [...array]
  let comparisons = 0
  let operations = 0

  for (let i = 1; i < arr.length; i++) {
    const key = arr[i]
    let j = i - 1

    operations++

    while (j >= 0) {
      const leftValue = arr[j]
      comparisons++
      operations++

      onStep({
        array: [...arr],
        comparing: [j, j + 1],
        swapped: false,
        operations,
        comparisons,
        note: `Compare ${leftValue} with insertion key ${key}.`,
        stepType: 'compare',
        activeRange: [0, i],
      })

      await waitForControl(speed, control, 'compare')

      if (leftValue <= key) {
        break
      }

      arr[j + 1] = leftValue
      operations++

      onStep({
        array: [...arr],
        comparing: [j, j + 1],
        swapped: true,
        operations,
        comparisons,
        note: `Shift ${leftValue} from index ${j} to ${j + 1}.`,
        stepType: 'write',
        writeIndex: j + 1,
        activeRange: [0, i],
      })

      await waitForControl(speed, control, 'write')

      j--
    }

    arr[j + 1] = key
    operations++

    onStep({
      array: [...arr],
      comparing: [j + 1],
      swapped: true,
      operations,
      comparisons,
      note: `Insert ${key} at index ${j + 1}.`,
      stepType: 'write',
      writeIndex: j + 1,
      activeRange: [0, i],
    })

    await waitForControl(speed, control, 'write')
  }

  return { array: arr, comparisons, operations }
}

// Heap Sort with step tracking
export async function heapSort(
  array: number[],
  onStep: (step: SortStep) => void,
  speed: number = 50,
  control?: SortExecutionControl
) {
  const arr = [...array]
  let comparisons = 0
  let operations = 0

  async function heapify(heapSize: number, rootIndex: number): Promise<void> {
    let largest = rootIndex
    const left = 2 * rootIndex + 1
    const right = 2 * rootIndex + 2

    if (left < heapSize) {
      const rootValue = arr[largest]
      const leftValue = arr[left]

      comparisons++
      operations++

      onStep({
        array: [...arr],
        comparing: [largest, left],
        swapped: false,
        operations,
        comparisons,
        note: `Compare parent ${rootValue} with left child ${leftValue}.`,
        stepType: 'compare',
        activeRange: [0, heapSize - 1],
      })

      await waitForControl(speed, control, 'compare')

      if (leftValue > rootValue) {
        largest = left
      }
    }

    if (right < heapSize) {
      const candidateValue = arr[largest]
      const rightValue = arr[right]

      comparisons++
      operations++

      onStep({
        array: [...arr],
        comparing: [largest, right],
        swapped: false,
        operations,
        comparisons,
        note: `Compare candidate ${candidateValue} with right child ${rightValue}.`,
        stepType: 'compare',
        activeRange: [0, heapSize - 1],
      })

      await waitForControl(speed, control, 'compare')

      if (rightValue > candidateValue) {
        largest = right
      }
    }

    if (largest !== rootIndex) {
      const rootValue = arr[rootIndex]
      const largestValue = arr[largest]

      ;[arr[rootIndex], arr[largest]] = [arr[largest], arr[rootIndex]]
      operations += 3

      onStep({
        array: [...arr],
        comparing: [rootIndex, largest],
        swapped: true,
        operations,
        comparisons,
        note: `Swap ${rootValue} with ${largestValue} to maintain heap order.`,
        stepType: 'swap',
        activeRange: [0, heapSize - 1],
      })

      await waitForControl(speed, control, 'swap')
      await heapify(heapSize, largest)
    }
  }

  for (let i = Math.floor(arr.length / 2) - 1; i >= 0; i--) {
    await heapify(arr.length, i)
  }

  for (let end = arr.length - 1; end > 0; end--) {
    const rootValue = arr[0]
    const endValue = arr[end]

    ;[arr[0], arr[end]] = [arr[end], arr[0]]
    operations += 3

    onStep({
      array: [...arr],
      comparing: [0, end],
      swapped: true,
      operations,
      comparisons,
      note: `Move heap maximum ${rootValue} to index ${end} by swapping with ${endValue}.`,
      stepType: 'swap',
      activeRange: [0, end],
    })

    await waitForControl(speed, control, 'swap')
    await heapify(end, 0)
  }

  return { array: arr, comparisons, operations }
}

// Shell Sort with step tracking
export async function shellSort(
  array: number[],
  onStep: (step: SortStep) => void,
  speed: number = 50,
  control?: SortExecutionControl
) {
  const arr = [...array]
  let comparisons = 0
  let operations = 0
  let gap = Math.floor(arr.length / 2)

  while (gap > 0) {
    for (let i = gap; i < arr.length; i++) {
      const temp = arr[i]
      let j = i

      operations++

      while (j >= gap) {
        const comparedValue = arr[j - gap]

        comparisons++
        operations++

        onStep({
          array: [...arr],
          comparing: [j - gap, j],
          swapped: false,
          operations,
          comparisons,
          note: `Compare ${comparedValue} with ${temp} for gap ${gap}.`,
          stepType: 'compare',
          activeRange: [0, arr.length - 1],
        })

        await waitForControl(speed, control, 'compare')

        if (comparedValue <= temp) {
          break
        }

        arr[j] = comparedValue
        operations++

        onStep({
          array: [...arr],
          comparing: [j - gap, j],
          swapped: true,
          operations,
          comparisons,
          note: `Shift ${comparedValue} from index ${j - gap} to ${j}.`,
          stepType: 'write',
          writeIndex: j,
          activeRange: [0, arr.length - 1],
        })

        await waitForControl(speed, control, 'write')

        j -= gap
      }

      arr[j] = temp
      operations++

      onStep({
        array: [...arr],
        comparing: [j],
        swapped: true,
        operations,
        comparisons,
        note: `Place ${temp} at index ${j} for gap ${gap}.`,
        stepType: 'write',
        writeIndex: j,
        activeRange: [0, arr.length - 1],
      })

      await waitForControl(speed, control, 'write')
    }

    gap = Math.floor(gap / 2)
  }

  return { array: arr, comparisons, operations }
}

// Counting Sort with step tracking
export async function countingSort(
  array: number[],
  onStep: (step: SortStep) => void,
  speed: number = 50,
  control?: SortExecutionControl
) {
  const arr = [...array]

  if (arr.length === 0) {
    return { array: arr, comparisons: 0, operations: 0 }
  }

  let comparisons = 0
  let operations = 0
  const minValue = Math.min(...arr)
  const maxValue = Math.max(...arr)
  const range = maxValue - minValue + 1
  const counts = new Array(range).fill(0)

  for (let i = 0; i < arr.length; i++) {
    const value = arr[i]
    const bucketIndex = value - minValue

    counts[bucketIndex] += 1
    operations++
    comparisons++

    onStep({
      array: [...arr],
      comparing: [i],
      swapped: false,
      operations,
      comparisons,
      note: `Count value ${value}.`,
      stepType: 'copy',
      activeRange: [0, arr.length - 1],
    })

    await waitForControl(speed, control, 'copy')
  }

  for (let i = 1; i < counts.length; i++) {
    counts[i] += counts[i - 1]
    operations++
    comparisons++
  }

  const output = new Array(arr.length)

  for (let i = arr.length - 1; i >= 0; i--) {
    const value = arr[i]
    const bucketIndex = value - minValue
    counts[bucketIndex] -= 1
    const outputIndex = counts[bucketIndex]
    output[outputIndex] = value
    arr[outputIndex] = value
    operations += 2
    comparisons++

    onStep({
      array: [...arr],
      comparing: [i, outputIndex],
      swapped: true,
      operations,
      comparisons,
      note: `Place ${value} at index ${outputIndex}.`,
      stepType: 'write',
      writeIndex: outputIndex,
      activeRange: [0, arr.length - 1],
    })

    await waitForControl(speed, control, 'write')
  }

  return { array: arr, comparisons, operations }
}

// Radix Sort with step tracking
export async function radixSort(
  array: number[],
  onStep: (step: SortStep) => void,
  speed: number = 50,
  control?: SortExecutionControl
) {
  const arr = [...array]

  if (arr.length === 0) {
    return { array: arr, comparisons: 0, operations: 0 }
  }

  let comparisons = 0
  let operations = 0
  const minValue = Math.min(...arr)
  const offset = minValue < 0 ? -minValue : 0
  const shifted = arr.map((value) => value + offset)
  const maxShifted = Math.max(...shifted)

  for (let exponent = 1; Math.floor(maxShifted / exponent) > 0; exponent *= 10) {
    const counts = new Array(10).fill(0)
    const output = new Array(shifted.length).fill(0)

    for (let i = 0; i < shifted.length; i++) {
      const digit = Math.floor(shifted[i] / exponent) % 10
      counts[digit] += 1
      operations++
      comparisons++

      onStep({
        array: [...arr],
        comparing: [i],
        swapped: false,
        operations,
        comparisons,
        note: `Read digit ${digit} from value ${arr[i]} at place ${exponent}.`,
        stepType: 'copy',
        activeRange: [0, arr.length - 1],
      })

      await waitForControl(speed, control, 'copy')
    }

    for (let i = 1; i < 10; i++) {
      counts[i] += counts[i - 1]
      operations++
      comparisons++
    }

    for (let i = shifted.length - 1; i >= 0; i--) {
      const digit = Math.floor(shifted[i] / exponent) % 10
      counts[digit] -= 1
      const outputIndex = counts[digit]
      output[outputIndex] = shifted[i]
      operations += 2
      comparisons++
    }

    for (let i = 0; i < shifted.length; i++) {
      shifted[i] = output[i]
      arr[i] = shifted[i] - offset
      operations++
      comparisons++

      onStep({
        array: [...arr],
        comparing: [i],
        swapped: true,
        operations,
        comparisons,
        note: `Write ${arr[i]} after processing place ${exponent}.`,
        stepType: 'write',
        writeIndex: i,
        activeRange: [0, arr.length - 1],
      })

      await waitForControl(speed, control, 'write')
    }
  }

  return { array: arr, comparisons, operations }
}

// Bucket Sort with step tracking
export async function bucketSort(
  array: number[],
  onStep: (step: SortStep) => void,
  speed: number = 50,
  control?: SortExecutionControl
) {
  const arr = [...array]

  if (arr.length === 0) {
    return { array: arr, comparisons: 0, operations: 0 }
  }

  let comparisons = 0
  let operations = 0
  const minValue = Math.min(...arr)
  const maxValue = Math.max(...arr)

  if (minValue === maxValue) {
    return { array: arr, comparisons, operations }
  }

  const bucketCount = Math.max(1, Math.floor(Math.sqrt(arr.length)))
  const span = maxValue - minValue + 1
  const buckets: number[][] = Array.from({ length: bucketCount }, () => [])

  for (let i = 0; i < arr.length; i++) {
    const value = arr[i]
    const rawIndex = Math.floor(((value - minValue) / span) * bucketCount)
    const bucketIndex = Math.min(bucketCount - 1, Math.max(0, rawIndex))
    buckets[bucketIndex].push(value)
    operations++
    comparisons++

    onStep({
      array: [...arr],
      comparing: [i],
      swapped: false,
      operations,
      comparisons,
      note: `Place ${value} into bucket ${bucketIndex + 1}.`,
      stepType: 'copy',
      activeRange: [0, arr.length - 1],
    })

    await waitForControl(speed, control, 'copy')
  }

  let writeIndex = 0

  for (let bucketIndex = 0; bucketIndex < buckets.length; bucketIndex++) {
    const bucket = buckets[bucketIndex]
    bucket.sort((a, b) => a - b)

    for (let i = 0; i < bucket.length; i++) {
      const value = bucket[i]
      arr[writeIndex] = value
      operations++
      comparisons++

      onStep({
        array: [...arr],
        comparing: [writeIndex],
        swapped: true,
        operations,
        comparisons,
        note: `Write ${value} from bucket ${bucketIndex + 1} to index ${writeIndex}.`,
        stepType: 'write',
        writeIndex,
        activeRange: [0, arr.length - 1],
      })

      await waitForControl(speed, control, 'write')
      writeIndex++
    }
  }

  return { array: arr, comparisons, operations }
}

export interface SearchResult {
  found: boolean
  index: number
  comparisons: number
  operations: number
}

// Linear Search
export async function linearSearch(
  array: number[],
  target: number,
  onStep: (step: SortStep) => void,
  speed: number = 50,
  control?: SortExecutionControl
): Promise<SearchResult> {
  const arr = [...array]
  let comparisons = 0
  let operations = 0

  for (let index = 0; index < arr.length; index++) {
    comparisons++
    operations++

    onStep({
      array: [...arr],
      comparing: [index],
      swapped: false,
      operations,
      comparisons,
      stepType: 'compare',
      activeRange: [index, arr.length - 1],
      note: `Check index ${index}: compare ${arr[index]} with target ${target}.`,
    })

    await waitForControl(speed, control, 'compare')

    if (arr[index] === target) {
      return { found: true, index, comparisons, operations }
    }
  }

  return { found: false, index: -1, comparisons, operations }
}

// Binary Search
export async function binarySearch(
  array: number[],
  target: number,
  onStep: (step: SortStep) => void,
  speed: number = 50,
  control?: SortExecutionControl
): Promise<SearchResult> {
  const sortedArr = [...array].sort((a, b) => a - b)
  let comparisons = 0
  let operations = 0
  let left = 0
  let right = sortedArr.length - 1

  while (left <= right) {
    const mid = Math.floor((left + right) / 2)
    comparisons++
    operations++

    onStep({
      array: [...sortedArr],
      comparing: [left, right, mid],
      swapped: false,
      operations,
      comparisons,
      stepType: 'compare',
      activeRange: [left, right],
      note: `Search between indices ${left} and ${right}; check middle value ${sortedArr[mid]} at index ${mid}.`,
    })

    await waitForControl(speed, control, 'compare')

    if (sortedArr[mid] === target) {
      return { found: true, index: mid, comparisons, operations }
    }

    if (sortedArr[mid] < target) {
      left = mid + 1
    } else {
      right = mid - 1
    }
  }

  return { found: false, index: -1, comparisons, operations }
}

// Jump Search
export async function jumpSearch(
  array: number[],
  target: number,
  onStep: (step: SortStep) => void,
  speed: number = 50,
  control?: SortExecutionControl
): Promise<SearchResult> {
  const arr = [...array].sort((a, b) => a - b)
  const n = arr.length
  let comparisons = 0
  let operations = 0

  if (n === 0) {
    return { found: false, index: -1, comparisons, operations }
  }

  const stepSize = Math.max(1, Math.floor(Math.sqrt(n)))
  let blockStart = 0
  let blockEndExclusive = Math.min(stepSize, n)

  while (blockStart < n) {
    const blockEnd = blockEndExclusive - 1

    comparisons++
    operations++

    onStep({
      array: [...arr],
      comparing: [blockEnd],
      swapped: false,
      operations,
      comparisons,
      stepType: 'compare',
      activeRange: [blockStart, blockEnd],
      note: `Jump to block ending at index ${blockEnd}; compare ${arr[blockEnd]} with target ${target}.`,
    })

    await waitForControl(speed, control, 'compare')

    if (arr[blockEnd] >= target) {
      break
    }

    blockStart = blockEndExclusive
    blockEndExclusive = Math.min(blockEndExclusive + stepSize, n)

    if (blockStart >= n) {
      return { found: false, index: -1, comparisons, operations }
    }
  }

  const searchEnd = Math.min(blockEndExclusive, n) - 1

  for (let index = blockStart; index <= searchEnd; index++) {
    comparisons++
    operations++

    onStep({
      array: [...arr],
      comparing: [index],
      swapped: false,
      operations,
      comparisons,
      stepType: 'compare',
      activeRange: [blockStart, searchEnd],
      note: `Linear scan inside block: compare index ${index} value ${arr[index]} with target ${target}.`,
    })

    await waitForControl(speed, control, 'compare')

    if (arr[index] === target) {
      return { found: true, index, comparisons, operations }
    }

    if (arr[index] > target) {
      break
    }
  }

  return { found: false, index: -1, comparisons, operations }
}

// Interpolation Search
export async function interpolationSearch(
  array: number[],
  target: number,
  onStep: (step: SortStep) => void,
  speed: number = 50,
  control?: SortExecutionControl
): Promise<SearchResult> {
  const arr = [...array].sort((a, b) => a - b)
  let comparisons = 0
  let operations = 0
  let low = 0
  let high = arr.length - 1

  while (
    low <= high &&
    arr.length > 0 &&
    target >= arr[low] &&
    target <= arr[high]
  ) {
    let probe = low

    if (arr[high] !== arr[low]) {
      probe = low + Math.floor(((target - arr[low]) * (high - low)) / (arr[high] - arr[low]))
    }

    probe = Math.max(low, Math.min(probe, high))

    comparisons++
    operations++

    onStep({
      array: [...arr],
      comparing: [low, high, probe],
      swapped: false,
      operations,
      comparisons,
      stepType: 'compare',
      activeRange: [low, high],
      note: `Estimate probe at index ${probe}; compare ${arr[probe]} with target ${target}.`,
    })

    await waitForControl(speed, control, 'compare')

    if (arr[probe] === target) {
      return { found: true, index: probe, comparisons, operations }
    }

    if (arr[probe] < target) {
      low = probe + 1
    } else {
      high = probe - 1
    }
  }

  return { found: false, index: -1, comparisons, operations }
}

// Exponential Search
export async function exponentialSearch(
  array: number[],
  target: number,
  onStep: (step: SortStep) => void,
  speed: number = 50,
  control?: SortExecutionControl
): Promise<SearchResult> {
  const arr = [...array].sort((a, b) => a - b)
  let comparisons = 0
  let operations = 0

  if (arr.length === 0) {
    return { found: false, index: -1, comparisons, operations }
  }

  comparisons++
  operations++

  onStep({
    array: [...arr],
    comparing: [0],
    swapped: false,
    operations,
    comparisons,
    stepType: 'compare',
    activeRange: [0, 0],
    note: `Check first element ${arr[0]} against target ${target}.`,
  })

  await waitForControl(speed, control, 'compare')

  if (arr[0] === target) {
    return { found: true, index: 0, comparisons, operations }
  }

  let bound = 1

  while (bound < arr.length && arr[bound] <= target) {
    comparisons++
    operations++

    onStep({
      array: [...arr],
      comparing: [bound],
      swapped: false,
      operations,
      comparisons,
      stepType: 'compare',
      activeRange: [0, Math.min(bound, arr.length - 1)],
      note: `Expand range to index ${bound}; compare ${arr[bound]} with target ${target}.`,
    })

    await waitForControl(speed, control, 'compare')

    if (arr[bound] === target) {
      return { found: true, index: bound, comparisons, operations }
    }

    bound *= 2
  }

  let left = Math.floor(bound / 2)
  let right = Math.min(bound, arr.length - 1)

  while (left <= right) {
    const mid = Math.floor((left + right) / 2)
    comparisons++
    operations++

    onStep({
      array: [...arr],
      comparing: [left, right, mid],
      swapped: false,
      operations,
      comparisons,
      stepType: 'compare',
      activeRange: [left, right],
      note: `Binary search in expanded range [${left}, ${right}]; check index ${mid}.`,
    })

    await waitForControl(speed, control, 'compare')

    if (arr[mid] === target) {
      return { found: true, index: mid, comparisons, operations }
    }

    if (arr[mid] < target) {
      left = mid + 1
    } else {
      right = mid - 1
    }
  }

  return { found: false, index: -1, comparisons, operations }
}

// Fibonacci Search
export async function fibonacciSearch(
  array: number[],
  target: number,
  onStep: (step: SortStep) => void,
  speed: number = 50,
  control?: SortExecutionControl
): Promise<SearchResult> {
  const arr = [...array].sort((a, b) => a - b)
  const n = arr.length
  let comparisons = 0
  let operations = 0

  if (n === 0) {
    return { found: false, index: -1, comparisons, operations }
  }

  let fibMm2 = 0
  let fibMm1 = 1
  let fibM = fibMm1 + fibMm2

  while (fibM < n) {
    fibMm2 = fibMm1
    fibMm1 = fibM
    fibM = fibMm1 + fibMm2
  }

  let offset = -1

  while (fibM > 1) {
    const probe = Math.min(offset + fibMm2, n - 1)
    const rangeStart = Math.max(0, offset + 1)
    const rangeEnd = Math.min(n - 1, offset + fibM)

    comparisons++
    operations++

    onStep({
      array: [...arr],
      comparing: [probe],
      swapped: false,
      operations,
      comparisons,
      stepType: 'compare',
      activeRange: [rangeStart, rangeEnd],
      note: `Probe index ${probe} using Fibonacci offsets; compare ${arr[probe]} with target ${target}.`,
    })

    await waitForControl(speed, control, 'compare')

    if (arr[probe] < target) {
      fibM = fibMm1
      fibMm1 = fibMm2
      fibMm2 = fibM - fibMm1
      offset = probe
      continue
    }

    if (arr[probe] > target) {
      fibM = fibMm2
      fibMm1 = fibMm1 - fibMm2
      fibMm2 = fibM - fibMm1
      continue
    }

    return { found: true, index: probe, comparisons, operations }
  }

  if (fibMm1 && offset + 1 < n) {
    const probe = offset + 1
    comparisons++
    operations++

    onStep({
      array: [...arr],
      comparing: [probe],
      swapped: false,
      operations,
      comparisons,
      stepType: 'compare',
      activeRange: [probe, probe],
      note: `Final Fibonacci check at index ${probe}.`,
    })

    await waitForControl(speed, control, 'compare')

    if (arr[probe] === target) {
      return { found: true, index: probe, comparisons, operations }
    }
  }

  return { found: false, index: -1, comparisons, operations }
}

// BFS Search on implicit binary tree indexed in array order
export async function bfsSearch(
  array: number[],
  target: number,
  onStep: (step: SortStep) => void,
  speed: number = 50,
  control?: SortExecutionControl
): Promise<SearchResult> {
  const arr = [...array]
  let comparisons = 0
  let operations = 0

  if (arr.length === 0) {
    return { found: false, index: -1, comparisons, operations }
  }

  const queue: number[] = [0]
  const visited = new Set<number>()

  while (queue.length > 0) {
    const index = queue.shift()

    if (typeof index !== 'number' || index < 0 || index >= arr.length || visited.has(index)) {
      continue
    }

    visited.add(index)
    comparisons++
    operations++

    onStep({
      array: [...arr],
      comparing: [index],
      swapped: false,
      operations,
      comparisons,
      stepType: 'compare',
      note: `BFS visits index ${index} (value ${arr[index]}).`,
    })

    await waitForControl(speed, control, 'compare')

    if (arr[index] === target) {
      return { found: true, index, comparisons, operations }
    }

    const left = 2 * index + 1
    const right = 2 * index + 2

    if (left < arr.length) {
      queue.push(left)
    }

    if (right < arr.length) {
      queue.push(right)
    }
  }

  return { found: false, index: -1, comparisons, operations }
}

// DFS Search on implicit binary tree indexed in array order
export async function dfsSearch(
  array: number[],
  target: number,
  onStep: (step: SortStep) => void,
  speed: number = 50,
  control?: SortExecutionControl
): Promise<SearchResult> {
  const arr = [...array]
  let comparisons = 0
  let operations = 0

  if (arr.length === 0) {
    return { found: false, index: -1, comparisons, operations }
  }

  const stack: number[] = [0]
  const visited = new Set<number>()

  while (stack.length > 0) {
    const index = stack.pop()

    if (typeof index !== 'number' || index < 0 || index >= arr.length || visited.has(index)) {
      continue
    }

    visited.add(index)
    comparisons++
    operations++

    onStep({
      array: [...arr],
      comparing: [index],
      swapped: false,
      operations,
      comparisons,
      stepType: 'compare',
      note: `DFS visits index ${index} (value ${arr[index]}).`,
    })

    await waitForControl(speed, control, 'compare')

    if (arr[index] === target) {
      return { found: true, index, comparisons, operations }
    }

    const left = 2 * index + 1
    const right = 2 * index + 2

    if (right < arr.length) {
      stack.push(right)
    }

    if (left < arr.length) {
      stack.push(left)
    }
  }

  return { found: false, index: -1, comparisons, operations }
}

// Helper function to delay execution
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Generate random array
export function generateRandomArray(size: number, max: number = 100): number[] {
  return Array.from({ length: size }, () => Math.floor(Math.random() * max) + 1)
}

// Generate sorted array
export function generateSortedArray(size: number, max: number = 100): number[] {
  return Array.from({ length: size }, (_, i) =>
    Math.floor((i / size) * max) + 1
  )
}

// Generate reverse sorted array
export function generateReverseSortedArray(
  size: number,
  max: number = 100
): number[] {
  return Array.from({ length: size }, (_, i) =>
    Math.floor(((size - i) / size) * max) + 1
  )
}

// Generate nearly sorted array
export function generateNearlySortedArray(
  size: number,
  max: number = 100,
  swapCount: number = 5
): number[] {
  const arr = generateSortedArray(size, max)
  for (let i = 0; i < swapCount; i++) {
    const idx1 = Math.floor(Math.random() * size)
    const idx2 = Math.floor(Math.random() * size)
    ;[arr[idx1], arr[idx2]] = [arr[idx2], arr[idx1]]
  }
  return arr
}
