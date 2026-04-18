'use client'

import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  bubbleSort,
  selectionSort,
  insertionSort,
  heapSort,
  shellSort,
  countingSort,
  radixSort,
  bucketSort,
  quickSort,
  mergeSort,
  isSortAbortedError,
  speedToDelayMs,
  type SortStep,
} from '@/lib/algorithms'
import { saveExperiment } from '@/lib/experiment-tracker'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  ArrowLeftRight,
  ChevronDown,
  CheckCircle2,
  Circle,
  Pause,
  Play,
  Redo2,
  RotateCcw,
  SkipBack,
  SkipForward,
  Info,
  Layers,
  Settings2,
  Trophy,
  History as HistoryIcon,
  HelpCircle,
} from 'lucide-react'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  DatasetGenerator,
  type DatasetGeneratorMeta,
  type DatasetType,
} from './dataset-generator'

type SupportedAlgorithm =
  | 'bubble'
  | 'selection'
  | 'insertion'
  | 'merge'
  | 'quick'
  | 'heap'
  | 'shell'
  | 'counting'
  | 'radix'
  | 'bucket'

interface AlgorithmInfo {
  name: string
  description: string
  worstCase: string
  averageCase: string
  bestCase: string
  spaceComplexity: string
}

type VisualStepType = NonNullable<SortStep['stepType']>

const HOW_TO_STEPS = [
  {
    title: 'Generate Dataset',
    detail: 'Choose a dataset type, then generate values to visualize.',
  },
  {
    title: 'Select Algorithm',
    detail: 'Pick any sorting algorithm from the controls.',
  },
  {
    title: 'Adjust Speed',
    detail: 'Move speed between Slow and Fast based on your learning pace.',
  },
  {
    title: 'Start Visualization',
    detail: 'Run, pause, and step through each operation with explanations.',
  },
]

const ALGORITHM_INFO: Record<SupportedAlgorithm, AlgorithmInfo> = {
  bubble: {
    name: 'Bubble Sort',
    description:
      'Bubble Sort repeatedly compares adjacent values and swaps them if they are out of order. Larger values gradually move toward the end.',
    worstCase: 'O(n^2)',
    averageCase: 'O(n^2)',
    bestCase: 'O(n)',
    spaceComplexity: 'O(1)',
  },
  selection: {
    name: 'Selection Sort',
    description:
      'Selection Sort repeatedly finds the minimum value from the unsorted section and places it at the next sorted position.',
    worstCase: 'O(n^2)',
    averageCase: 'O(n^2)',
    bestCase: 'O(n^2)',
    spaceComplexity: 'O(1)',
  },
  insertion: {
    name: 'Insertion Sort',
    description:
      'Insertion Sort builds a sorted prefix one element at a time by inserting each new value into its correct position.',
    worstCase: 'O(n^2)',
    averageCase: 'O(n^2)',
    bestCase: 'O(n)',
    spaceComplexity: 'O(1)',
  },
  merge: {
    name: 'Merge Sort',
    description:
      'Merge Sort splits the array into halves, sorts each half, and merges them back together in sorted order.',
    worstCase: 'O(n log n)',
    averageCase: 'O(n log n)',
    bestCase: 'O(n log n)',
    spaceComplexity: 'O(n)',
  },
  quick: {
    name: 'Quick Sort',
    description:
      'Quick Sort chooses a pivot, partitions values into smaller groups, then recursively sorts each partition.',
    worstCase: 'O(n^2)',
    averageCase: 'O(n log n)',
    bestCase: 'O(n log n)',
    spaceComplexity: 'O(log n)',
  },
  heap: {
    name: 'Heap Sort',
    description:
      'Heap Sort builds a max heap and repeatedly extracts the largest element to place it at the end of the array.',
    worstCase: 'O(n log n)',
    averageCase: 'O(n log n)',
    bestCase: 'O(n log n)',
    spaceComplexity: 'O(1)',
  },
  shell: {
    name: 'Shell Sort',
    description:
      'Shell Sort performs insertion sort over progressively smaller gaps, improving efficiency on medium-sized datasets.',
    worstCase: 'O(n^2)',
    averageCase: 'O(n log n)',
    bestCase: 'O(n log n)',
    spaceComplexity: 'O(1)',
  },
  counting: {
    name: 'Counting Sort',
    description:
      'Counting Sort counts occurrences of each value and reconstructs the sorted array without direct element comparisons.',
    worstCase: 'O(n + k)',
    averageCase: 'O(n + k)',
    bestCase: 'O(n + k)',
    spaceComplexity: 'O(n + k)',
  },
  radix: {
    name: 'Radix Sort',
    description:
      'Radix Sort sorts numbers digit by digit, typically from least significant digit to most significant digit.',
    worstCase: 'O(d(n + k))',
    averageCase: 'O(d(n + k))',
    bestCase: 'O(d(n + k))',
    spaceComplexity: 'O(n + k)',
  },
  bucket: {
    name: 'Bucket Sort',
    description:
      'Bucket Sort distributes values into buckets, sorts each bucket, and concatenates them for the final sorted order.',
    worstCase: 'O(n^2)',
    averageCase: 'O(n + k)',
    bestCase: 'O(n + k)',
    spaceComplexity: 'O(n + k)',
  },
}

const EXPLANATION_SPEED_THRESHOLD = 65
const FAST_PACE_MESSAGE =
  `Fast pace is active. Lower speed to ${EXPLANATION_SPEED_THRESHOLD} or below for detailed explanations.`

function estimateBubblePass(comparisons: number, size: number) {
  if (size <= 1) {
    return 1
  }

  let remainingComparisons = comparisons

  for (let pass = 1; pass <= size - 1; pass += 1) {
    const comparisonsInPass = size - pass

    if (remainingComparisons <= comparisonsInPass) {
      return pass
    }

    remainingComparisons -= comparisonsInPass
  }

  return size - 1
}

function estimateTotalComparisons(algorithm: SupportedAlgorithm, size: number) {
  if (size <= 1) {
    return 1
  }

  switch (algorithm) {
    case 'bubble':
    case 'selection':
    case 'insertion':
      return (size * (size - 1)) / 2
    case 'counting':
      return size * 2
    case 'radix':
      return size * 3
    default:
      return size * Math.log2(size)
  }
}

function toDatasetLabel(source: DatasetGeneratorMeta['source'], datasetType?: DatasetType) {
  if (source === 'custom') {
    return 'Custom Input'
  }

  switch (datasetType) {
    case 'nearly-sorted':
      return 'Nearly Sorted'
    case 'reverse-sorted':
      return 'Reverse Sorted'
    case 'few-unique':
      return 'Few Unique'
    case 'already-sorted':
      return 'Already Sorted'
    default:
      return 'Random'
  }
}

function buildStepExplanation(step: SortStep, algorithm: SupportedAlgorithm) {
  if (step.note) {
    return step.note
  }

  const [leftIndex, rightIndex] = step.comparing
  const leftValue = typeof leftIndex === 'number' ? step.array[leftIndex] : undefined
  const rightValue = typeof rightIndex === 'number' ? step.array[rightIndex] : undefined

  if (typeof leftValue === 'number' && typeof rightValue === 'number') {
    if (algorithm === 'bubble') {
      const pass = estimateBubblePass(step.comparisons, step.array.length)

      if (step.swapped) {
        return `Pass ${pass} of Bubble Sort: swapping elements ${leftValue} and ${rightValue}.`
      }

      return `Pass ${pass} of Bubble Sort: comparing elements ${leftValue} and ${rightValue}.`
    }

    if (step.swapped) {
      return `Swapping elements ${leftValue} and ${rightValue} to improve order.`
    }

    return `Comparing elements ${leftValue} and ${rightValue}.`
  }

  return step.swapped
    ? 'Swapping elements to maintain sorted order.'
    : 'Comparing elements to determine the next move.'
}

function toStepTypeLabel(stepType?: SortStep['stepType']) {
  switch (stepType) {
    case 'compare':
      return 'Compare'
    case 'swap':
      return 'Swap'
    case 'write':
      return 'Write'
    case 'copy':
      return 'Copy'
    case 'pivot':
      return 'Pivot'
    case 'done':
      return 'Done'
    default:
      return 'Operation'
  }
}

function toStepTypeBadgeClass(stepType?: SortStep['stepType']) {
  switch (stepType) {
    case 'compare':
      return 'border-amber-400/40 bg-amber-400/10 text-amber-300'
    case 'swap':
      return 'border-red-400/40 bg-red-400/10 text-red-300'
    case 'write':
      return 'border-cyan-400/40 bg-cyan-400/10 text-cyan-300'
    case 'copy':
      return 'border-sky-400/40 bg-sky-400/10 text-sky-300'
    case 'pivot':
      return 'border-fuchsia-400/40 bg-fuchsia-400/10 text-fuchsia-300'
    case 'done':
      return 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
    default:
      return 'border-border/40 bg-background/25 text-foreground/75'
  }
}

function toCompactStepSummary(stepMessage: string, maxLength: number = 92) {
  const normalized = stepMessage.replace(/^Review mode:\s*/i, '').replace(/\s+/g, ' ').trim()

  if (normalized.length <= maxLength) {
    return normalized
  }

  return `${normalized.slice(0, maxLength).trimEnd()}...`
}

interface AlgorithmVisualizerProps {
  guideOpen?: boolean
  onGuideOpenChange?: (open: boolean) => void
  hideGuideToggle?: boolean
}

export function AlgorithmVisualizer({
  guideOpen,
  onGuideOpenChange,
  hideGuideToggle = false,
}: AlgorithmVisualizerProps = {}) {
  const [internalGuideOpen, setInternalGuideOpen] = useState(false)
  const [arraySize, setArraySize] = useState(30)
  const [algorithm, setAlgorithm] = useState<SupportedAlgorithm>('bubble')
  const [dataType, setDataType] = useState('Random')
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [array, setArray] = useState<number[]>([])
  const [initialDataset, setInitialDataset] = useState<number[]>([])
  const [datasetLoaded, setDatasetLoaded] = useState(false)
  const [comparing, setComparing] = useState<number[]>([])
  const [isSwapStep, setIsSwapStep] = useState(false)
  const [sortedIndices, setSortedIndices] = useState<number[]>([])
  const [stepMessage, setStepMessage] = useState('Choose a dataset method to begin.')
  const [speed, setSpeed] = useState(35)
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1)
  const [stepType, setStepType] = useState<VisualStepType | null>(null)
  const [activeRange, setActiveRange] = useState<[number, number] | null>(null)
  const [pivotIndex, setPivotIndex] = useState<number | null>(null)
  const [writeIndex, setWriteIndex] = useState<number | null>(null)
  const [stats, setStats] = useState({
    comparisons: 0,
    swaps: 0,
    operations: 0,
    time: 0,
  })
  const [isSorted, setIsSorted] = useState(false)
  const [barsContainerWidth, setBarsContainerWidth] = useState(0)

  const startTimeRef = useRef<number | null>(null)
  const isPausedRef = useRef(false)
  const stopRequestedRef = useRef(false)
  const stepForwardBudgetRef = useRef(0)
  const historyRef = useRef<SortStep[]>([])
  const swapsRef = useRef(0)
  const speedRef = useRef(speed)
  const barsContainerRef = useRef<HTMLDivElement | null>(null)

  const resolvedGuideOpen = typeof guideOpen === 'boolean' ? guideOpen : internalGuideOpen

  const handleGuideOpenChange = useCallback(
    (open: boolean) => {
      if (typeof guideOpen !== 'boolean') {
        setInternalGuideOpen(open)
      }

      onGuideOpenChange?.(open)
    },
    [guideOpen, onGuideOpenChange]
  )

  const algorithmInfo = ALGORITHM_INFO[algorithm]

  const applyHistoryFrame = useCallback(
    (requestedIndex: number) => {
      const timeline = historyRef.current
      if (timeline.length === 0) {
        return
      }

      const safeIndex = Math.max(0, Math.min(requestedIndex, timeline.length - 1))
      const frame = timeline[safeIndex]
      const swapsUntilFrame = timeline
        .slice(0, safeIndex + 1)
        .reduce((count, item) => count + (item.swapped ? 1 : 0), 0)

      setArray(frame.array)
      setComparing(frame.comparing)
      setIsSwapStep(Boolean(frame.swapped))
      setStats((previous) => ({
        ...previous,
        comparisons: frame.comparisons,
        swaps: swapsUntilFrame,
        operations: frame.operations,
      }))
      setProgress(Math.round(((safeIndex + 1) / timeline.length) * 100))
      setCurrentHistoryIndex(safeIndex)
      setCurrentStep(safeIndex + 1)
      setStepType(frame.stepType ?? null)
      setActiveRange(frame.activeRange ?? null)
      setPivotIndex(typeof frame.pivotIndex === 'number' ? frame.pivotIndex : null)
      setWriteIndex(typeof frame.writeIndex === 'number' ? frame.writeIndex : null)
      setStepMessage(`Review mode: ${buildStepExplanation(frame, algorithm)}`)
    },
    [algorithm]
  )

  const reset = useCallback(() => {
    stopRequestedRef.current = true
    isPausedRef.current = false
    stepForwardBudgetRef.current = 0
    historyRef.current = []
    swapsRef.current = 0

    const restored = initialDataset.length > 0 ? [...initialDataset] : []

    setArray(restored)
    setComparing([])
    setIsSwapStep(false)
    setSortedIndices([])
    if (restored.length > 0) {
      setArraySize(restored.length)
    }
    setStats({ comparisons: 0, swaps: 0, operations: 0, time: 0 })
    setProgress(0)
    setCurrentStep(0)
    setCurrentHistoryIndex(-1)
    setStepType(null)
    setActiveRange(null)
    setPivotIndex(null)
    setWriteIndex(null)
    setIsRunning(false)
    setIsPaused(false)
    setIsSorted(false)
    setDatasetLoaded(restored.length > 0)
    setStepMessage(
      restored.length > 0
        ? 'Visualization reset. Dataset is ready to run.'
        : 'Choose a dataset method to begin.'
    )
    startTimeRef.current = null
  }, [initialDataset])

  const handleDatasetReady = useCallback((dataset: number[], meta: DatasetGeneratorMeta) => {
    stopRequestedRef.current = true
    isPausedRef.current = false
    stepForwardBudgetRef.current = 0
    historyRef.current = []
    swapsRef.current = 0

    const nextDataset = [...dataset]

    setInitialDataset(nextDataset)
    setArray(nextDataset)
    setArraySize(nextDataset.length)
    setDataType(toDatasetLabel(meta.source, meta.datasetType))
    setDatasetLoaded(nextDataset.length > 0)
    setComparing([])
    setIsSwapStep(false)
    setSortedIndices([])
    setStats({ comparisons: 0, swaps: 0, operations: 0, time: 0 })
    setProgress(0)
    setCurrentStep(0)
    setCurrentHistoryIndex(-1)
    setStepType(null)
    setActiveRange(null)
    setPivotIndex(null)
    setWriteIndex(null)
    setIsRunning(false)
    setIsPaused(false)
    setIsSorted(false)
    setStepMessage(
      meta.source === 'custom'
        ? `Custom dataset loaded with ${nextDataset.length} values.`
        : `${toDatasetLabel(meta.source, meta.datasetType)} dataset generated with ${nextDataset.length} values.`
    )
    startTimeRef.current = null
  }, [])

  const handleAlgorithmChange = useCallback((value: string) => {
    const nextAlgorithm = value as SupportedAlgorithm

    if (nextAlgorithm === algorithm) {
      return
    }

    setAlgorithm(nextAlgorithm)

    stopRequestedRef.current = true
    isPausedRef.current = false
    stepForwardBudgetRef.current = 0
    historyRef.current = []
    swapsRef.current = 0

    const restored = initialDataset.length > 0 ? [...initialDataset] : []

    setArray(restored)
    setComparing([])
    setIsSwapStep(false)
    setSortedIndices([])
    setStats({ comparisons: 0, swaps: 0, operations: 0, time: 0 })
    setProgress(0)
    setCurrentStep(0)
    setCurrentHistoryIndex(-1)
    setStepType(null)
    setActiveRange(null)
    setPivotIndex(null)
    setWriteIndex(null)
    setIsRunning(false)
    setIsPaused(false)
    setIsSorted(false)
    startTimeRef.current = null

    setStepMessage(
      datasetLoaded
        ? `${ALGORITHM_INFO[nextAlgorithm].name} selected. Press Start to run step-by-step.`
        : 'Choose a dataset method to begin.'
    )
  }, [algorithm, datasetLoaded, initialDataset])

  const handleVisualizerStep = useCallback((step: SortStep) => {
    historyRef.current = [...historyRef.current, step]
    const latestHistoryIndex = historyRef.current.length - 1

    if (step.swapped) {
      swapsRef.current += 1
    }

    setArray(step.array)
    setComparing(step.comparing)
    setIsSwapStep(Boolean(step.swapped))

    setCurrentHistoryIndex(latestHistoryIndex)
    setCurrentStep(latestHistoryIndex + 1)
    setStepType(step.stepType ?? null)
    setActiveRange(step.activeRange ?? null)
    setPivotIndex(typeof step.pivotIndex === 'number' ? step.pivotIndex : null)
    setWriteIndex(typeof step.writeIndex === 'number' ? step.writeIndex : null)

    const estimatedTotal = estimateTotalComparisons(algorithm, step.array.length)
    const nextProgress = Math.min(100, Math.round((step.comparisons / estimatedTotal) * 100))
    setProgress(nextProgress)

    const detailedExplanationEnabled =
      speedRef.current <= EXPLANATION_SPEED_THRESHOLD ||
      isPausedRef.current ||
      stepForwardBudgetRef.current > 0 ||
      step.stepType === 'done'

    if (detailedExplanationEnabled) {
      setStepMessage(buildStepExplanation(step, algorithm))
    } else {
      setStepMessage((previous) =>
        previous === FAST_PACE_MESSAGE ? previous : FAST_PACE_MESSAGE
      )
    }

    setStats({
      comparisons: step.comparisons,
      swaps: swapsRef.current,
      operations: step.operations,
      time: startTimeRef.current ? Date.now() - startTimeRef.current : 0,
    })

    if (stepForwardBudgetRef.current > 0) {
      stepForwardBudgetRef.current -= 1

      if (stepForwardBudgetRef.current === 0) {
        isPausedRef.current = true
        setIsPaused(true)
      }
    }
  }, [algorithm])

  const handleSpeedChange = useCallback((values: number[]) => {
    const nextSpeed = values[0] ?? 50
    setSpeed(nextSpeed)
    speedRef.current = nextSpeed
  }, [])

  const runSort = useCallback(async () => {
    if (!datasetLoaded || array.length === 0 || isRunning) {
      return
    }

    const baseArray = initialDataset.length > 0 ? [...initialDataset] : [...array]

    setIsRunning(true)
    setIsPaused(false)
    setIsSorted(false)
    setSortedIndices([])
    setArray(baseArray)
    setProgress(0)
    setCurrentStep(0)
    setCurrentHistoryIndex(-1)
    setStepType(null)
    setActiveRange(null)
    setPivotIndex(null)
    setWriteIndex(null)
    setStats({ comparisons: 0, swaps: 0, operations: 0, time: 0 })
    setStepMessage('Sorting started. Follow comparisons and swaps in real time.')

    isPausedRef.current = false
    stopRequestedRef.current = false
    stepForwardBudgetRef.current = 0
    historyRef.current = []
    swapsRef.current = 0
    speedRef.current = speed

    startTimeRef.current = Date.now()
    const arrayCopy = [...baseArray]

    try {
      let result: { array: number[]; comparisons: number; operations: number } | undefined

      const control = {
        shouldPause: () => isPausedRef.current && stepForwardBudgetRef.current <= 0,
        shouldStop: () => stopRequestedRef.current,
        getSpeed: () => speedRef.current,
      }

      if (algorithm === 'bubble') {
        result = await bubbleSort(arrayCopy, handleVisualizerStep, speed, control)
      } else if (algorithm === 'selection') {
        result = await selectionSort(arrayCopy, handleVisualizerStep, speed, control)
      } else if (algorithm === 'insertion') {
        result = await insertionSort(arrayCopy, handleVisualizerStep, speed, control)
      } else if (algorithm === 'merge') {
        result = await mergeSort(arrayCopy, handleVisualizerStep, speed, control)
      } else if (algorithm === 'quick') {
        result = await quickSort(arrayCopy, handleVisualizerStep, speed, control)
      } else if (algorithm === 'heap') {
        result = await heapSort(arrayCopy, handleVisualizerStep, speed, control)
      } else if (algorithm === 'shell') {
        result = await shellSort(arrayCopy, handleVisualizerStep, speed, control)
      } else if (algorithm === 'counting') {
        result = await countingSort(arrayCopy, handleVisualizerStep, speed, control)
      } else if (algorithm === 'radix') {
        result = await radixSort(arrayCopy, handleVisualizerStep, speed, control)
      } else if (algorithm === 'bucket') {
        result = await bucketSort(arrayCopy, handleVisualizerStep, speed, control)
      }

      if (result && !stopRequestedRef.current) {
        const totalTime = startTimeRef.current ? Date.now() - startTimeRef.current : 0

        const finalFrame: SortStep = {
          array: [...result.array],
          comparing: [],
          swapped: false,
          comparisons: result.comparisons,
          operations: result.operations,
          stepType: 'done',
          note: 'Sorting complete. All elements are in non-decreasing order.',
        }

        const lastFrame = historyRef.current[historyRef.current.length - 1]
        const hasMatchingFinalFrame =
          Boolean(lastFrame) &&
          lastFrame.comparisons === finalFrame.comparisons &&
          lastFrame.operations === finalFrame.operations &&
          lastFrame.array.length === finalFrame.array.length &&
          lastFrame.array.every((value, index) => value === finalFrame.array[index])

        if (!hasMatchingFinalFrame) {
          historyRef.current = [...historyRef.current, finalFrame]
        }

        setArray(result.array)
        setSortedIndices(Array.from({ length: result.array.length }, (_, i) => i))
        setStats({
          comparisons: result.comparisons,
          swaps: swapsRef.current,
          operations: result.operations,
          time: totalTime,
        })
        setCurrentHistoryIndex(historyRef.current.length - 1)
        setCurrentStep(historyRef.current.length)
        setStepType('done')
        setActiveRange(null)
        setPivotIndex(null)
        setWriteIndex(null)
        setProgress(100)
        setIsSorted(true)
        setStepMessage('Sorting complete. All elements are in non-decreasing order.')

        try {
          await saveExperiment({
            algorithm,
            mode: 'visualizer',
            arraySize: result.array.length,
            executionTime: totalTime,
            comparisons: result.comparisons,
            operations: result.operations,
            dataType: dataType.toLowerCase(),
            metadata: {
              speed: speedRef.current,
              totalSteps: historyRef.current.length,
            },
          })
        } catch (error) {
          toast.error('Sorting finished, but experiment could not be saved')
          console.error(error)
        }
      } else if (stopRequestedRef.current) {
        setStepMessage('Visualization stopped. You can review recorded steps or reset.')
      }
    } catch (error) {
      if (!isSortAbortedError(error)) {
        toast.error('Sorting failed')
        console.error(error)
      }
    } finally {
      setIsRunning(false)
      stepForwardBudgetRef.current = 0

      if (!stopRequestedRef.current) {
        setIsPaused(false)
        isPausedRef.current = false
        setComparing([])
        setIsSwapStep(false)
      }
    }
  }, [array, algorithm, speed, handleVisualizerStep, isRunning, dataType, datasetLoaded, initialDataset])

  const pauseSort = useCallback(() => {
    if (!isRunning || isPaused) {
      return
    }

    setIsPaused(true)
    isPausedRef.current = true
    setStepMessage('Paused. Use Resume or Step Forward to continue.')
  }, [isPaused, isRunning])

  const resumeSort = useCallback(() => {
    if (!isRunning || !isPaused) {
      return
    }

    stepForwardBudgetRef.current = 0
    setIsPaused(false)
    isPausedRef.current = false
    setStepMessage('Resumed. Watching next operation...')
  }, [isPaused, isRunning])

  const stepForward = useCallback(() => {
    if (isRunning) {
      if (!isPaused) {
        setStepMessage('Pause the run before stepping forward.')
        return
      }

      stepForwardBudgetRef.current = 1
      setIsPaused(false)
      isPausedRef.current = false
      setStepMessage('Stepping forward by one operation...')
      return
    }

    if (historyRef.current.length === 0) {
      setStepMessage('No timeline available. Start visualization first.')
      return
    }

    if (currentHistoryIndex >= historyRef.current.length - 1) {
      setStepMessage('Already on the latest recorded step.')
      return
    }

    applyHistoryFrame(currentHistoryIndex + 1)
  }, [applyHistoryFrame, currentHistoryIndex, isPaused, isRunning])

  const stepBackward = useCallback(() => {
    if (historyRef.current.length === 0) {
      setStepMessage('No timeline available. Start visualization first.')
      return
    }

    if (isRunning && !isPaused) {
      setStepMessage('Pause the run before stepping backward.')
      return
    }

    if (currentHistoryIndex <= 0) {
      applyHistoryFrame(0)
      setStepMessage('Already at the first recorded step.')
      return
    }

    if (isRunning) {
      stopRequestedRef.current = true
      isPausedRef.current = false
      setIsPaused(false)
    }

    setIsSorted(false)
    setSortedIndices([])
    applyHistoryFrame(currentHistoryIndex - 1)
  }, [applyHistoryFrame, currentHistoryIndex, isPaused, isRunning])

  const maxValue = array.length > 0 ? Math.max(...array.map((value) => Math.abs(value))) : 1
  const barGapClass = array.length > 80 ? 'gap-px' : array.length > 45 ? 'gap-[2px]' : 'gap-0.5'
  const sortedLookup = new Set(sortedIndices)
  const operationLabel = toStepTypeLabel(stepType ?? undefined)
  const compactStepSummary = toCompactStepSummary(stepMessage)
  const currentDelayMs = speedToDelayMs(speed)
  const isFastExplanationMode = isRunning && !isPaused && speed > EXPLANATION_SPEED_THRESHOLD
  const speedLabel =
    speed <= 25
      ? 'Teacher Pace'
      : speed <= 50
        ? 'Classroom Pace'
        : speed <= 75
          ? 'Balanced Pace'
          : 'Fast Demo Pace'
  const labelInterval = useMemo(() => {
    if (array.length <= 30 && barsContainerWidth > 0) {
      const perBarWidth = barsContainerWidth / Math.max(array.length, 1)

      if (perBarWidth >= 18) {
        return 1
      }
    }

    return array.length <= 24 ? 1 : array.length <= 40 ? 2 : array.length <= 70 ? 4 : 6
  }, [array.length, barsContainerWidth])

  useEffect(() => {
    const container = barsContainerRef.current

    if (!container || typeof ResizeObserver === 'undefined') {
      return
    }

    const updateWidth = () => {
      setBarsContainerWidth(container.clientWidth)
    }

    updateWidth()

    const observer = new ResizeObserver(() => {
      updateWidth()
    })

    observer.observe(container)

    return () => {
      observer.disconnect()
    }
  }, [])

  return (
    <div className="flex flex-col gap-6">
      {/* Beginner guide content */}
      <div className="flex justify-center">
        <Collapsible open={resolvedGuideOpen} onOpenChange={handleGuideOpenChange} className="w-full">
          {!hideGuideToggle && (
            <div className="flex justify-center mb-2">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="text-muted-foreground text-xs hover:text-primary transition-colors">
                  <HelpCircle className="mr-2 size-3.5" />
                  Need help? View the Beginner's Guide
                  <ChevronDown className={cn('ml-1.5 size-3.5 transition-transform', resolvedGuideOpen && 'rotate-180')} />
                </Button>
              </CollapsibleTrigger>
            </div>
          )}
          <CollapsibleContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 pb-1">
              {HOW_TO_STEPS.map((step, index) => (
                <Card key={step.title} className="glass-card p-4 border-muted/30">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="flex size-6 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold">
                      {index + 1}
                    </span>
                    <h4 className="text-sm font-bold">{step.title}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{step.detail}</p>
                </Card>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* ── Top Metrics Bar ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="glass-card flex flex-col justify-center border-primary/20 p-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">Comparisons</p>
          <p className="mt-1 text-xl font-bold text-primary">{stats.comparisons}</p>
        </div>
        <div className="glass-card flex flex-col justify-center border-orange-500/20 p-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">Swaps</p>
          <p className="mt-1 text-xl font-bold text-orange-400">{stats.swaps}</p>
        </div>
        <div className="glass-card flex flex-col justify-center border-purple-500/20 p-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">Operations</p>
          <p className="mt-1 text-xl font-bold text-purple-400">{stats.operations}</p>
        </div>
        <div className="glass-card flex flex-col justify-center border-amber-500/20 p-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">Time</p>
          <p className="mt-1 text-xl font-bold text-amber-400">{stats.time}ms</p>
        </div>
        <div className="glass-card flex flex-col justify-center border-blue-500/20 p-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">Array Size</p>
          <p className="mt-1 text-xl font-bold text-blue-400">{arraySize}</p>
        </div>
        <div className="glass-card flex flex-col justify-center border-emerald-500/20 p-3 text-center overflow-hidden">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">Progress</p>
          <div className="mt-2 flex items-center justify-center gap-2">
            <span className="text-xl font-bold text-emerald-400">{progress}%</span>
          </div>
          <div className="mt-1 w-full h-1 bg-muted/30 rounded-full overflow-hidden">
             <div className="h-full bg-emerald-400 transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[400px_1fr]">
        {/* ── Left Sidebar / Operations Center ── */}
        <aside className="flex flex-col gap-8">
          <Card className="glass-card flex flex-col p-0 overflow-hidden border-primary/20">
            <div className="bg-primary/10 border-b border-primary/20 px-5 py-4">
               <div className="flex items-center gap-2">
                  <Settings2 className="size-4 text-primary" />
                  <h2 className="text-base font-bold text-foreground">Operations Center</h2>
               </div>
               <p className="mt-0.5 text-xs text-muted-foreground">Configure and control the visualization</p>
            </div>

            <Tabs defaultValue="algorithm" className="w-full">
              <TabsList className="w-full rounded-none border-b border-border/20 bg-background/20 h-10 p-0">
                <TabsTrigger value="dataset" className="flex-1 rounded-none text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary border-r border-border/20">
                  <Layers className="mr-2 size-3.5" />
                  Dataset
                </TabsTrigger>
                <TabsTrigger value="algorithm" className="flex-1 rounded-none text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                  <Play className="mr-2 size-3.5" />
                  Algorithm
                </TabsTrigger>
              </TabsList>

              <div className="p-6">
                <TabsContent value="dataset" className="mt-0 space-y-4">
                  <DatasetGenerator onDatasetReady={handleDatasetReady} disabled={isRunning} hidePreview className="!p-0 !bg-transparent !border-0 !shadow-none" />
                </TabsContent>

                <TabsContent value="algorithm" className="mt-0 space-y-7">
                  {/* Algorithm Selector */}
                  <div className="space-y-3">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">1. Select Algorithm</Label>
                    <Select
                      value={algorithm}
                      onValueChange={handleAlgorithmChange}
                      disabled={isRunning}
                    >
                      <SelectTrigger className="h-10 bg-input/20 border-border/50 text-foreground transition-all focus:ring-primary/40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover/95 backdrop-blur-xl border-border/50">
                        <SelectItem value="bubble">Bubble Sort</SelectItem>
                        <SelectItem value="selection">Selection Sort</SelectItem>
                        <SelectItem value="insertion">Insertion Sort</SelectItem>
                        <SelectItem value="merge">Merge Sort</SelectItem>
                        <SelectItem value="quick">Quick Sort</SelectItem>
                        <SelectItem value="heap">Heap Sort</SelectItem>
                        <SelectItem value="shell">Shell Sort</SelectItem>
                        <SelectItem value="counting">Counting Sort</SelectItem>
                        <SelectItem value="radix">Radix Sort</SelectItem>
                        <SelectItem value="bucket">Bucket Sort</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Playback Controls */}
                  <div className="space-y-3">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">2. Playback Control</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        onClick={() => void runSort()}
                        disabled={!datasetLoaded || array.length === 0 || isRunning}
                        className="h-10 col-span-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
                      >
                        <Play className="mr-2 size-4" />
                        Start Visualization
                      </Button>
                      <Button
                        onClick={pauseSort}
                        disabled={!isRunning || isPaused}
                        variant="outline"
                        className="h-10 border-border/50 hover:bg-primary/10 hover:border-primary/30"
                      >
                        <Pause className="mr-2 size-4" />
                        Pause
                      </Button>
                      <Button
                        onClick={resumeSort}
                        disabled={!isRunning || !isPaused}
                        variant="outline"
                        className="h-10 border-border/50 hover:bg-primary/10 hover:border-primary/30"
                      >
                        <Redo2 className="mr-2 size-4" />
                        Resume
                      </Button>
                      <Button
                        onClick={stepBackward}
                        variant="outline"
                        disabled={historyRef.current.length === 0 || currentHistoryIndex <= 0 || (isRunning && !isPaused)}
                        className="h-10 border-border/50 hover:bg-primary/10 hover:border-primary/30"
                      >
                        <SkipBack className="mr-2 size-4" />
                        Step Back
                      </Button>
                      <Button
                        onClick={stepForward}
                        variant="outline"
                        disabled={(!isPaused && isRunning) || (!isRunning && currentHistoryIndex >= historyRef.current.length - 1)}
                        className="h-10 border-border/50 hover:bg-primary/10 hover:border-primary/30"
                      >
                        <SkipForward className="mr-2 size-4" />
                        Step Forward
                      </Button>
                      <Button
                        onClick={reset}
                        disabled={!datasetLoaded}
                        variant="outline"
                        className="h-10 col-span-2 border-border/50 hover:bg-destructive/10 hover:border-destructive/30"
                      >
                        <RotateCcw className="mr-2 size-4" />
                        Reset Session
                      </Button>
                    </div>
                  </div>

                  {/* Speed Controller */}
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">3. Animation Speed</Label>
                      <Badge variant="outline" className="text-[10px] border-primary/20 text-primary">
                        {speedLabel}
                      </Badge>
                    </div>
                    <div className="px-1">
                      <Slider
                        value={[speed]}
                        onValueChange={handleSpeedChange}
                        min={1}
                        max={100}
                        step={1}
                        className="py-4"
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                      <span>Slow</span>
                      <span>~{currentDelayMs} ms/step</span>
                      <span>Fast</span>
                    </div>
                    {isFastExplanationMode && (
                      <div className="flex gap-2 rounded-lg bg-orange-500/10 border border-orange-500/20 p-2 text-[11px] text-orange-400">
                      <Info className="size-3.5 shrink-0" />
                      <p>Speed is too high for step-by-step notes. Reduce below {EXPLANATION_SPEED_THRESHOLD}.</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </Card>

        </aside>

        {/* ── Right Column: Visualization ── */}
        <main className="flex flex-col gap-4">
          <Card className="glass-card p-0 overflow-hidden flex flex-col shadow-[0_20px_50px_rgba(45,35,66,0.2)]">
            {/* Viz Header */}
            <div className="flex items-center justify-between px-6 py-3 bg-background/20 border-b border-border/20">
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <h2 className="text-base font-bold text-foreground">Sorting Arena</h2>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                  {algorithmInfo.name}
                </Badge>
                <div className="text-[11px] text-muted-foreground font-mono">
                  {progress}% Complete
                </div>
              </div>
            </div>

            {/* Step Message bar */}
            <div className="px-6 py-2 bg-primary/5 border-b border-primary/10 flex items-center gap-3">
              <Info className="size-3.5 text-primary shrink-0" />
              <p className="text-xs text-foreground/90 font-medium truncate">{stepMessage}</p>
            </div>

            {/* Bars Area */}
            <div
              ref={barsContainerRef}
              className={cn(
                'h-80 flex items-end justify-center px-6 py-5 bg-gradient-to-b from-input/5 to-input/10 rounded-lg',
                barGapClass
              )}
            >
              {array.length === 0 ? (
                <div className="flex flex-col items-center gap-4 text-center opacity-50">
                  <Layers className="size-12" />
                  <div>
                    <p className="text-lg font-bold">Workspace Empty</p>
                    <p className="text-sm">Use the Dataset tab on the left to generate items.</p>
                  </div>
                </div>
              ) : (
                array.map((value, idx) => {
                  const isComparing = comparing.includes(idx)
                  const isSortedIdx = sortedLookup.has(idx)
                  const isPivotIdx = typeof pivotIndex === 'number' && pivotIndex === idx
                  const isWriteIdx = typeof writeIndex === 'number' && writeIndex === idx
                  const isInActiveRange =
                    !activeRange || (idx >= activeRange[0] && idx <= activeRange[1])
                  const normalizedValue = Math.abs(value)
                  const shouldShowLabel = array.length <= 40 && (idx % labelInterval === 0 || isComparing || isSortedIdx)

                  return (
                    <div
                      key={idx}
                      className="relative flex h-full min-w-0 flex-1 items-end"
                      style={{ flex: '1' }}
                    >
                      <motion.div
                        className="w-full rounded-t-md transition-shadow"
                        animate={{
                          height: `${(normalizedValue / maxValue) * 100}%`,
                          backgroundColor: isSortedIdx
                            ? 'rgb(34, 197, 94)'
                            : isPivotIdx
                              ? 'rgb(232, 121, 249)'
                              : isWriteIdx
                                ? 'rgb(34, 211, 238)'
                            : isComparing && isSwapStep
                              ? 'rgb(239, 68, 68)'
                              : isComparing
                                ? 'rgb(250, 204, 21)'
                                : 'rgb(59, 130, 246)',
                          boxShadow: isComparing
                            ? '0 0 16px rgba(250, 204, 21, 0.6)'
                            : isSortedIdx
                              ? '0 0 16px rgba(34, 197, 94, 0.5)'
                              : '0 4px 12px rgba(59, 130, 246, 0.2)',
                          opacity: isInActiveRange ? 1 : 0.3,
                        }}
                        transition={{
                          type: 'spring',
                          damping: 18,
                          stiffness: 230,
                          mass: 0.4,
                        }}
                      />
                      {shouldShowLabel && (
                        <span className="pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] font-mono font-bold text-foreground/85">
                          {value}
                        </span>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            {/* Legend bar */}
            <div className="px-6 py-3 bg-gradient-to-r from-background/50 to-primary/5 border-t border-border/30">
               <div className="flex flex-wrap gap-x-6 gap-y-2">
                  <div className="flex items-center gap-2">
                    <div className="size-2 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50" />
                    <span className="text-[9px] uppercase font-bold text-muted-foreground">Unsorted</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="size-2 rounded-full bg-yellow-400 shadow-lg shadow-yellow-400/50" />
                    <span className="text-[9px] uppercase font-bold text-muted-foreground">Compare</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="size-2 rounded-full bg-red-500 shadow-lg shadow-red-500/50" />
                    <span className="text-[9px] uppercase font-bold text-muted-foreground">Swap</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="size-2 rounded-full bg-fuchsia-400 shadow-lg shadow-fuchsia-400/50" />
                    <span className="text-[9px] uppercase font-bold text-muted-foreground">Pivot</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="size-2 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/50" />
                    <span className="text-[9px] uppercase font-bold text-muted-foreground">Write</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="size-2 rounded-full bg-green-500 shadow-lg shadow-green-500/50" />
                    <span className="text-[9px] uppercase font-bold text-muted-foreground">Sorted</span>
                  </div>
               </div>
            </div>

            {/* Summary Stats */}
            <div className="px-6 py-3 bg-background/20 border-t border-border/20 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground uppercase font-bold">Operation</span>
                <Badge variant="outline" className={cn('text-[10px] h-6 px-2.5', toStepTypeBadgeClass(stepType ?? undefined))}>
                  {operationLabel}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground uppercase font-bold">Step</span>
                <span className="font-mono text-primary font-bold">{currentStep}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground uppercase font-bold">Pivot/Write</span>
                <span className="font-mono font-bold text-sm">
                  {pivotIndex ?? 'None'} / {writeIndex ?? 'None'}
                </span>
              </div>
            </div>

          </Card>
        </main>
      </div>

      {/* Dataset Preview (Full Width) */}
      <Card className={cn("glass-card p-5 space-y-3 transition-all", array.length === 0 && "opacity-50")}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-primary" />
            <h3 className="text-base font-bold text-foreground">Dataset</h3>
          </div>
          <Badge variant="outline" className="text-[10px] border-border/50 bg-background/30">
            {array.length} items
          </Badge>
        </div>
        {array.length === 0 ? (
           <p className="text-[11px] text-muted-foreground italic">No dataset generated yet.</p>
        ) : (
          <div className="rounded-lg border border-border/40 bg-background/30 p-2.5">
            <div className="flex flex-wrap gap-1.5">
              {array.map((value, index) => (
                <span
                  key={`${value}-${index}`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border/50 bg-background/45 px-2.5 py-1.5"
                >
                  <span className="text-xs text-muted-foreground">[{index}]</span>
                  <span className="font-mono text-sm font-bold text-foreground/90">{value}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Sort Theory (Below Dataset Preview) */}
      <Card className="glass-card p-0 overflow-hidden">
        <div className="px-6 py-3 bg-primary/5 border-b border-primary/10">
          <h3 className="text-lg font-bold text-primary mb-2">{algorithmInfo.name} Theory</h3>
          <p className="text-base text-foreground/75 leading-relaxed mb-3">{algorithmInfo.description}</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-3">
            <div className="p-2 rounded-lg border border-border/20 bg-background/30 flex flex-col gap-0.5">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Worst</span>
              <span className="text-base font-bold text-red-400 font-mono">{algorithmInfo.worstCase}</span>
            </div>
            <div className="p-2 rounded-lg border border-border/20 bg-background/30 flex flex-col gap-0.5">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Avg</span>
              <span className="text-base font-bold text-blue-400 font-mono">{algorithmInfo.averageCase}</span>
            </div>
            <div className="p-2 rounded-lg border border-border/20 bg-background/30 flex flex-col gap-0.5">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Best</span>
              <span className="text-base font-bold text-emerald-400 font-mono">{algorithmInfo.bestCase}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 pt-2 border-t border-border/10 sm:grid-cols-2">
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Space</span>
              <span className="text-base font-bold text-purple-400 font-mono">{algorithmInfo.spaceComplexity}</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Current Op</span>
              <Badge variant="outline" className={cn('text-[10px] h-6 px-2.5', toStepTypeBadgeClass(stepType ?? undefined))}>
                {operationLabel}
              </Badge>
            </div>
          </div>
        </div>
      </Card>

    </div>
  )
}
