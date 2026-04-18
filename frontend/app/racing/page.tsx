'use client'

import React, { useState, useCallback, useRef } from 'react'
import { WorkspaceShell } from '@/components/layout/workspace-shell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
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
  generateRandomArray,
  type SortStep,
} from '@/lib/algorithms'
import { Play, RotateCcw } from 'lucide-react'

type RacingAlgorithm =
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

const RACING_ALGORITHM_OPTIONS: Array<{ value: RacingAlgorithm; label: string }> = [
  { value: 'bubble', label: 'Bubble Sort' },
  { value: 'selection', label: 'Selection Sort' },
  { value: 'insertion', label: 'Insertion Sort' },
  { value: 'merge', label: 'Merge Sort' },
  { value: 'quick', label: 'Quick Sort' },
  { value: 'heap', label: 'Heap Sort' },
  { value: 'shell', label: 'Shell Sort' },
  { value: 'counting', label: 'Counting Sort' },
  { value: 'radix', label: 'Radix Sort' },
  { value: 'bucket', label: 'Bucket Sort' },
]

const RACING_ALGORITHM_RUNNERS: Record<
  RacingAlgorithm,
  (arr: number[], onStep: (step: SortStep) => void, speed: number) => Promise<unknown>
> = {
  bubble: bubbleSort,
  selection: selectionSort,
  insertion: insertionSort,
  merge: mergeSort,
  quick: quickSort,
  heap: heapSort,
  shell: shellSort,
  counting: countingSort,
  radix: radixSort,
  bucket: bucketSort,
}

export default function RacingPage() {
  const [arraySize, setArraySize] = useState(50)
  const [algorithm1, setAlgorithm1] = useState<RacingAlgorithm>('bubble')
  const [algorithm2, setAlgorithm2] = useState<RacingAlgorithm>('quick')
  const [isRunning, setIsRunning] = useState(false)
  const [array, setArray] = useState(() => generateRandomArray(50))
  const [speed, setSpeed] = useState(50)
  const [winner, setWinner] = useState<'left' | 'right' | null>(null)

  const [left, setLeft] = useState({
    array: [...array],
    comparing: [] as number[],
    comparisons: 0,
    operations: 0,
    time: 0,
  })

  const [right, setRight] = useState({
    array: [...array],
    comparing: [] as number[],
    comparisons: 0,
    operations: 0,
    time: 0,
  })

  const startTimeRef = useRef<{ left: number; right: number }>({
    left: 0,
    right: 0,
  })
  const finishedRef = useRef<{ left: boolean; right: boolean }>({
    left: false,
    right: false,
  })

  const reset = useCallback(() => {
    const newArray = generateRandomArray(arraySize)
    setArray(newArray)
    setLeft({
      array: [...newArray],
      comparing: [],
      comparisons: 0,
      operations: 0,
      time: 0,
    })
    setRight({
      array: [...newArray],
      comparing: [],
      comparisons: 0,
      operations: 0,
      time: 0,
    })
    setWinner(null)
    setIsRunning(false)
    finishedRef.current = { left: false, right: false }
  }, [arraySize])

  const handleLeftStep = useCallback((step: SortStep) => {
    setLeft({
      array: step.array,
      comparing: step.comparing,
      comparisons: step.comparisons,
      operations: step.operations,
      time: Date.now() - startTimeRef.current.left,
    })
  }, [])

  const handleRightStep = useCallback((step: SortStep) => {
    setRight({
      array: step.array,
      comparing: step.comparing,
      comparisons: step.comparisons,
      operations: step.operations,
      time: Date.now() - startTimeRef.current.right,
    })
  }, [])

  const runRace = useCallback(async () => {
    if (isRunning) return

    setIsRunning(true)
    setWinner(null)
    finishedRef.current = { left: false, right: false }

    startTimeRef.current = {
      left: Date.now(),
      right: Date.now(),
    }

    const arrayCopy1 = [...array]
    const arrayCopy2 = [...array]

    const runAlgorithm = async (
      alg: RacingAlgorithm,
      arr: number[],
      isLeftSide: boolean
    ) => {
      try {
        const onStep = isLeftSide ? handleLeftStep : handleRightStep
        await RACING_ALGORITHM_RUNNERS[alg](arr, onStep, speed)

        finishedRef.current[isLeftSide ? 'left' : 'right'] = true

        if (finishedRef.current.left && finishedRef.current.right) {
          setIsRunning(false)
          if (left.time < right.time) {
            setWinner('left')
          } else if (right.time < left.time) {
            setWinner('right')
          }
        } else if (finishedRef.current[isLeftSide ? 'left' : 'right']) {
          setWinner(isLeftSide ? 'left' : 'right')
          setIsRunning(false)
        }
      } catch (error) {
        console.error('Error running algorithm:', error)
      }
    }

    Promise.all([
      runAlgorithm(algorithm1, arrayCopy1, true),
      runAlgorithm(algorithm2, arrayCopy2, false),
    ])
  }, [
    array,
    algorithm1,
    algorithm2,
    speed,
    isRunning,
    handleLeftStep,
    handleRightStep,
    left.time,
    right.time,
  ])

  const maxValue = Math.max(...array)
  const getAlgorithmName = (alg: RacingAlgorithm) =>
    RACING_ALGORITHM_OPTIONS.find((option) => option.value === alg)?.label ?? alg

  return (
    <WorkspaceShell
      title="Algorithm Racing"
      description="Run two algorithms on the same dataset and compare time, comparisons, and operations in real time."
    >
      <div className="space-y-8">
        {/* Controls */}
        <Card className="glass-card mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-6">Controls</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="text-foreground">Left Algorithm</Label>
              <Select
                value={algorithm1}
                onValueChange={(value) => setAlgorithm1(value as RacingAlgorithm)}
                disabled={isRunning}
              >
                <SelectTrigger className="bg-input/50 border-border/50 text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border/50">
                  {RACING_ALGORITHM_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Array Size: {arraySize}</Label>
              <Slider
                value={[arraySize]}
                onValueChange={(e) => {
                  setArraySize(e[0])
                  reset()
                }}
                min={10}
                max={500}
                step={10}
                disabled={isRunning}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Right Algorithm</Label>
              <Select
                value={algorithm2}
                onValueChange={(value) => setAlgorithm2(value as RacingAlgorithm)}
                disabled={isRunning}
              >
                <SelectTrigger className="bg-input/50 border-border/50 text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border/50">
                  {RACING_ALGORITHM_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <Label className="text-foreground">Speed: {speed}</Label>
            <Slider
              value={[speed]}
              onValueChange={(e) => setSpeed(e[0])}
              min={1}
              max={100}
              step={1}
              disabled={isRunning}
            />
          </div>

          <div className="flex gap-4 mt-6">
            <Button
              onClick={runRace}
              disabled={isRunning}
              className="bg-primary hover:bg-primary/90 text-foreground"
            >
              <Play className="w-4 h-4 mr-2" />
              {isRunning ? 'Racing...' : 'Start Race'}
            </Button>
            <Button
              onClick={reset}
              disabled={isRunning}
              variant="outline"
              className="border-border/50 text-foreground hover:bg-card/50"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>
        </Card>

        {/* Winner Announcement */}
        {winner && (
          <Card className="glass-card mb-8 p-6 text-center border-primary">
            <p className="text-2xl font-bold text-primary mb-2">
              🏆 {winner === 'left' ? getAlgorithmName(algorithm1) : getAlgorithmName(algorithm2)} Wins!
            </p>
            <p className="text-foreground/60">
              Fastest algorithm completes first
            </p>
          </Card>
        )}

        {/* Race Track */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Side */}
          <Card className="glass-card">
            <h3 className="text-xl font-bold text-foreground mb-4">
              {getAlgorithmName(algorithm1)}
            </h3>

            <div className="space-y-4">
              <div className="flex items-end justify-center gap-0.5 h-64 bg-input/30 rounded-lg p-4">
                {left.array.map((value, idx) => (
                  <div
                    key={idx}
                    className="transition-all duration-100 rounded-t"
                    style={{
                      height: `${(value / maxValue) * 100}%`,
                      flex: '1',
                      backgroundColor: left.comparing.includes(idx)
                        ? 'rgb(248, 113, 113)'
                        : 'rgb(59, 130, 246)',
                    }}
                  />
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="glass p-3 rounded">
                  <p className="text-foreground/60">Comparisons</p>
                  <p className="text-lg font-bold text-primary">
                    {left.comparisons}
                  </p>
                </div>
                <div className="glass p-3 rounded">
                  <p className="text-foreground/60">Time</p>
                  <p className="text-lg font-bold text-accent">{left.time}ms</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Right Side */}
          <Card className="glass-card">
            <h3 className="text-xl font-bold text-foreground mb-4">
              {getAlgorithmName(algorithm2)}
            </h3>

            <div className="space-y-4">
              <div className="flex items-end justify-center gap-0.5 h-64 bg-input/30 rounded-lg p-4">
                {right.array.map((value, idx) => (
                  <div
                    key={idx}
                    className="transition-all duration-100 rounded-t"
                    style={{
                      height: `${(value / maxValue) * 100}%`,
                      flex: '1',
                      backgroundColor: right.comparing.includes(idx)
                        ? 'rgb(248, 113, 113)'
                        : 'rgb(168, 85, 247)',
                    }}
                  />
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="glass p-3 rounded">
                  <p className="text-foreground/60">Comparisons</p>
                  <p className="text-lg font-bold text-primary">
                    {right.comparisons}
                  </p>
                </div>
                <div className="glass p-3 rounded">
                  <p className="text-foreground/60">Time</p>
                  <p className="text-lg font-bold text-accent">{right.time}ms</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </WorkspaceShell>
  )
}
