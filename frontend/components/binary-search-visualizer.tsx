'use client'

import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  RotateCcw,
  Pause,
  Redo2,
  SkipBack,
  SkipForward,
  Info,
  Layers,
  Settings2,
  Search,
  Target,
  Hash,
  HelpCircle,
  ChevronDown,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  linearSearch,
  binarySearch,
  jumpSearch,
  interpolationSearch,
  exponentialSearch,
  fibonacciSearch,
  bfsSearch,
  dfsSearch,
  type SortStep,
  type SortExecutionControl,
  type SearchResult,
  isSortAbortedError,
} from '@/lib/algorithms'
import { cn } from '@/lib/utils'
import { DatasetGenerator, type DatasetGeneratorMeta } from './dataset-generator'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

type SearchAlgorithm =
  | 'binary'
  | 'linear'
  | 'jump'
  | 'interpolation'
  | 'exponential'
  | 'fibonacci'
  | 'bfs'
  | 'dfs'

interface SearchAlgorithmInfo {
  name: string
  description: string
  requiresSorted: boolean
  worstCase: string
  averageCase: string
  bestCase: string
  spaceComplexity: string
}

const SEARCH_ALGORITHM_INFO: Record<SearchAlgorithm, SearchAlgorithmInfo> = {
  binary: {
    name: 'Binary Search',
    description:
      'Binary Search repeatedly splits a sorted array in half to discard impossible regions quickly.',
    requiresSorted: true,
    worstCase: 'O(log n)',
    averageCase: 'O(log n)',
    bestCase: 'O(1)',
    spaceComplexity: 'O(1)',
  },
  linear: {
    name: 'Linear Search',
    description:
      'Linear Search checks values one-by-one from left to right until it finds the target or reaches the end.',
    requiresSorted: false,
    worstCase: 'O(n)',
    averageCase: 'O(n)',
    bestCase: 'O(1)',
    spaceComplexity: 'O(1)',
  },
  jump: {
    name: 'Jump Search',
    description:
      'Jump Search skips ahead by fixed blocks in sorted data and then performs a local linear scan.',
    requiresSorted: true,
    worstCase: 'O(√n)',
    averageCase: 'O(√n)',
    bestCase: 'O(1)',
    spaceComplexity: 'O(1)',
  },
  interpolation: {
    name: 'Interpolation Search',
    description:
      'Interpolation Search estimates the likely position based on target value distribution in sorted data.',
    requiresSorted: true,
    worstCase: 'O(n)',
    averageCase: 'O(log log n)',
    bestCase: 'O(1)',
    spaceComplexity: 'O(1)',
  },
  exponential: {
    name: 'Exponential Search',
    description:
      'Exponential Search grows a search range exponentially, then runs binary search inside that range.',
    requiresSorted: true,
    worstCase: 'O(log n)',
    averageCase: 'O(log n)',
    bestCase: 'O(1)',
    spaceComplexity: 'O(1)',
  },
  fibonacci: {
    name: 'Fibonacci Search',
    description:
      'Fibonacci Search narrows sorted ranges using Fibonacci-number offsets instead of midpoint splits.',
    requiresSorted: true,
    worstCase: 'O(log n)',
    averageCase: 'O(log n)',
    bestCase: 'O(1)',
    spaceComplexity: 'O(1)',
  },
  bfs: {
    name: 'BFS',
    description:
      'BFS explores an implicit binary-tree view of the array level by level using a queue.',
    requiresSorted: false,
    worstCase: 'O(n)',
    averageCase: 'O(n)',
    bestCase: 'O(1)',
    spaceComplexity: 'O(n)',
  },
  dfs: {
    name: 'DFS',
    description:
      'DFS explores an implicit binary-tree view of the array depth-first using a stack.',
    requiresSorted: false,
    worstCase: 'O(n)',
    averageCase: 'O(n)',
    bestCase: 'O(1)',
    spaceComplexity: 'O(n)',
  },
}

const TREE_VIEWBOX_WIDTH = 860
const TREE_VIEWBOX_HEIGHT = 420
const TREE_HORIZONTAL_PADDING = 32
const TREE_VERTICAL_PADDING_TOP = 36
const TREE_VERTICAL_PADDING_BOTTOM = 48

const HOW_TO_STEPS = [
  {
    title: 'Generate Data',
    detail: 'Create a dataset from the Dataset tab to start experimenting.',
  },
  {
    title: 'Choose Search Algorithm',
    detail: 'Switch between linear, logarithmic, and graph-style search strategies.',
  },
  {
    title: 'Set Search Target',
    detail: 'Enter the value you want to locate in the dataset.',
  },
  {
    title: 'Start Search',
    detail: 'Run, pause, and step through each search operation to see how the algorithm explores.',
  },
]

interface BinarySearchVisualizerProps {
  guideOpen?: boolean
  onGuideOpenChange?: (open: boolean) => void
  hideGuideToggle?: boolean
}

export function BinarySearchVisualizer({
  guideOpen,
  onGuideOpenChange,
  hideGuideToggle = false,
}: BinarySearchVisualizerProps = {}) {
  const [array, setArray] = useState<number[]>([])
  const [algorithm, setAlgorithm] = useState<SearchAlgorithm>('binary')
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [target, setTarget] = useState(50)
  const [comparing, setComparing] = useState<number[]>([])
  const [foundIndex, setFoundIndex] = useState<number | null>(null)
  const [activeRange, setActiveRange] = useState<[number, number] | null>(null)
  const [speed, setSpeed] = useState(50)
  const [currentStep, setCurrentStep] = useState(0)
  const [stepMessage, setStepMessage] = useState('Ready to search...')
  const [stats, setStats] = useState({
    comparisons: 0,
    steps: 0,
  })
  const [internalGuideOpen, setInternalGuideOpen] = useState(false)
  const [barsContainerWidth, setBarsContainerWidth] = useState(0)
  const [isBothSidebarsCollapsed, setIsBothSidebarsCollapsed] = useState(false)

  const algorithmInfo = SEARCH_ALGORITHM_INFO[algorithm]
  const isTreeMode = algorithm === 'bfs' || algorithm === 'dfs'

  const stopSignalRef = useRef(false)
  const pauseSignalRef = useRef(false)
  const barsContainerRef = useRef<HTMLDivElement | null>(null)
  const historyRef = useRef<SortStep[]>([])
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1)

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

  const labelInterval = useMemo(() => {
    if (array.length <= 30 && barsContainerWidth > 0) {
      const perBarWidth = barsContainerWidth / Math.max(array.length, 1)

      if (perBarWidth >= 18) {
        return 1
      }
    }

    return array.length <= 24 ? 1 : array.length <= 40 ? 2 : array.length <= 70 ? 4 : 6
  }, [array.length, barsContainerWidth])

  const executionControl = useMemo<SortExecutionControl>(
    () => ({
      shouldPause: () => pauseSignalRef.current,
      shouldStop: () => stopSignalRef.current,
      getSpeed: () => speed,
    }),
    [speed]
  )

  const maxValue = useMemo(() => (array.length > 0 ? Math.max(...array) : 100), [array])
  const speedLabel = speed <= 25 ? 'Slow' : speed <= 50 ? 'Medium' : speed <= 75 ? 'Fast' : 'Hyper'
  const treeNodeCount = useMemo(() => {
    if (!isTreeMode) {
      return 0
    }

    return array.length
  }, [array.length, isTreeMode])

  const treeLevels = useMemo(() => {
    if (treeNodeCount <= 0) {
      return 0
    }

    return Math.floor(Math.log2(treeNodeCount)) + 1
  }, [treeNodeCount])

  const treeMaxNodesInLevel = useMemo(() => {
    if (treeNodeCount <= 0 || treeLevels <= 0) {
      return 1
    }

    let maxNodes = 1

    for (let level = 0; level < treeLevels; level++) {
      const levelStartIndex = 2 ** level - 1
      const availableNodes = treeNodeCount - levelStartIndex
      const nodesInLevel = Math.max(0, Math.min(2 ** level, availableNodes))
      maxNodes = Math.max(maxNodes, nodesInLevel)
    }

    return maxNodes
  }, [treeLevels, treeNodeCount])

  const treeViewboxWidth = useMemo(() => {
    if (!isTreeMode || !isBothSidebarsCollapsed || barsContainerWidth <= 0) {
      return TREE_VIEWBOX_WIDTH
    }

    // Use wider space only when both sidebars are collapsed.
    return Math.max(TREE_VIEWBOX_WIDTH, Math.round((barsContainerWidth - 32) * 1.15))
  }, [barsContainerWidth, isBothSidebarsCollapsed, isTreeMode])

  const treeViewboxHeight = useMemo(() => {
    if (!isTreeMode || !isBothSidebarsCollapsed) {
      return TREE_VIEWBOX_HEIGHT
    }

    return Math.round(TREE_VIEWBOX_HEIGHT * 1.24)
  }, [isBothSidebarsCollapsed, isTreeMode])

  const treeNodeRadius = useMemo(() => {
    if (treeNodeCount <= 0) {
      return 0
    }

    const baseRadius =
      treeNodeCount <= 30
        ? treeLevels >= 5
          ? 20
          : 24
        : treeNodeCount <= 50
          ? 16
          : treeNodeCount <= 80
            ? 12
            : 9

    const usableWidth = treeViewboxWidth - TREE_HORIZONTAL_PADDING * 2
    const maxSafeDiameter = (usableWidth / (treeMaxNodesInLevel + 1)) * 0.86
    const widthLimitedRadius = Math.floor(maxSafeDiameter / 2)

    return Math.max(5, Math.min(baseRadius, widthLimitedRadius))
  }, [treeLevels, treeMaxNodesInLevel, treeNodeCount, treeViewboxWidth])

  const treeValueFontSize = useMemo(
    () => Math.max(8, Math.round(treeNodeRadius * 0.72)),
    [treeNodeRadius]
  )

  const treeIndexFontSize = useMemo(
    () => Math.max(7, Math.round(treeNodeRadius * 0.5)),
    [treeNodeRadius]
  )

  const treeValueBaselineOffset = useMemo(
    () => Math.max(2.8, Math.min(4.8, treeNodeRadius * 0.22)),
    [treeNodeRadius]
  )

  const treeValueStrokeWidth = useMemo(
    () => Math.max(0.55, treeNodeRadius * 0.04),
    [treeNodeRadius]
  )

  const treeNodes = useMemo(() => {
    if (treeNodeCount <= 0) {
      return []
    }

    const usableWidth = treeViewboxWidth - TREE_HORIZONTAL_PADDING * 2
    const usableHeight =
      treeViewboxHeight - TREE_VERTICAL_PADDING_TOP - TREE_VERTICAL_PADDING_BOTTOM

    return Array.from({ length: treeNodeCount }, (_, index) => {
      const level = Math.floor(Math.log2(index + 1))
      const levelStartIndex = 2 ** level - 1
      const indexInsideLevel = index - levelStartIndex
      const nodesInLevel = 2 ** level

      const x =
        TREE_HORIZONTAL_PADDING + ((indexInsideLevel + 1) / (nodesInLevel + 1)) * usableWidth
      const y =
        treeLevels > 1
          ? TREE_VERTICAL_PADDING_TOP + (level / (treeLevels - 1)) * usableHeight
          : TREE_VERTICAL_PADDING_TOP + usableHeight / 2

      const isCurrent = comparing.length > 2 ? comparing[2] === index : comparing.includes(index)
      const isFound = foundIndex === index
      const isInRange = !activeRange || (index >= activeRange[0] && index <= activeRange[1])
      const showIndex = treeNodeCount <= 15 || isCurrent || isFound

      return {
        index,
        value: array[index],
        x,
        y,
        isCurrent,
        isFound,
        isInRange,
        showIndex,
      }
    })
  }, [
    activeRange,
    array,
    comparing,
    foundIndex,
    treeLevels,
    treeNodeCount,
    treeViewboxHeight,
    treeViewboxWidth,
  ])

  const treeEdges = useMemo(() => {
    if (treeNodes.length <= 1) {
      return []
    }

    const nodeByIndex = new Map(treeNodes.map((node) => [node.index, node]))
    const edges: Array<{ parent: (typeof treeNodes)[number]; child: (typeof treeNodes)[number] }> = []

    for (let index = 1; index < treeNodeCount; index++) {
      const parentIndex = Math.floor((index - 1) / 2)
      const parent = nodeByIndex.get(parentIndex)
      const child = nodeByIndex.get(index)

      if (parent && child) {
        edges.push({ parent, child })
      }
    }

    return edges
  }, [treeNodeCount, treeNodes])

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

  useEffect(() => {
    const container = barsContainerRef.current

    if (!container || typeof HTMLElement === 'undefined') {
      return
    }

    const contentSection = container.closest('[data-both-sidebars-collapsed]') as HTMLElement | null

    if (!contentSection) {
      setIsBothSidebarsCollapsed(false)
      return
    }

    const updateCollapsedState = () => {
      setIsBothSidebarsCollapsed(contentSection.dataset.bothSidebarsCollapsed === 'true')
    }

    updateCollapsedState()

    if (typeof MutationObserver === 'undefined') {
      return
    }

    const observer = new MutationObserver(() => {
      updateCollapsedState()
    })

    observer.observe(contentSection, {
      attributes: true,
      attributeFilter: ['data-both-sidebars-collapsed'],
    })

    return () => {
      observer.disconnect()
    }
  }, [])

  // Reset function
  const reset = useCallback(() => {
    stopSignalRef.current = true
    setIsRunning(false)
    setIsPaused(false)
    pauseSignalRef.current = false
    setComparing([])
    setFoundIndex(null)
    setActiveRange(null)
    setCurrentStep(0)
    setStepMessage('Visualizer reset.')
    setStats({ comparisons: 0, steps: 0 })
    historyRef.current = []
    setCurrentHistoryIndex(-1)

    setTimeout(() => {
      stopSignalRef.current = false
    }, 100)
  }, [])

  const handleDatasetReady = useCallback((newData: number[], meta: DatasetGeneratorMeta) => {
    const prepared = algorithmInfo.requiresSorted
      ? [...newData].sort((a, b) => a - b)
      : [...newData]

    setArray(prepared)
    reset()
    setStepMessage(
      algorithmInfo.requiresSorted
        ? `Dataset generated (${meta.arraySize} items) and sorted for ${algorithmInfo.name}.`
        : `Dataset generated (${meta.arraySize} items).`
    )
  }, [algorithmInfo.name, algorithmInfo.requiresSorted, reset])

  const handleAlgorithmChange = useCallback((value: string) => {
    const nextAlgorithm = value as SearchAlgorithm
    const nextInfo = SEARCH_ALGORITHM_INFO[nextAlgorithm]

    setAlgorithm(nextAlgorithm)
    setArray((previous) =>
      nextInfo.requiresSorted ? [...previous].sort((a, b) => a - b) : previous
    )
    reset()
    setStepMessage(
      nextInfo.requiresSorted
        ? `${nextInfo.name} selected. Dataset sorted automatically for correctness.`
        : `${nextInfo.name} selected.`
    )
  }, [reset])

  const applyStep = useCallback((step: SortStep) => {
    setArray(step.array)
    setComparing(step.comparing)
    setActiveRange(step.activeRange ?? null)
    setStats({
      comparisons: step.comparisons,
      steps: step.operations,
    })
    setStepMessage(step.note ?? '')
  }, [])

  const runSearch = useCallback(async () => {
    if (array.length === 0) return
    reset()
    
    setIsRunning(true)
    stopSignalRef.current = false
    pauseSignalRef.current = false
    setStepMessage(`Running ${algorithmInfo.name}...`)

    try {
      const preparedArray = algorithmInfo.requiresSorted
        ? [...array].sort((a, b) => a - b)
        : [...array]

      setArray(preparedArray)

      const onStep = (step: SortStep) => {
        historyRef.current.push(step)
        setCurrentHistoryIndex(historyRef.current.length - 1)
        applyStep(step)
        setCurrentStep((prev) => prev + 1)
      }

      let result: SearchResult

      if (algorithm === 'linear') {
        result = await linearSearch(preparedArray, target, onStep, speed, executionControl)
      } else if (algorithm === 'binary') {
        result = await binarySearch(preparedArray, target, onStep, speed, executionControl)
      } else if (algorithm === 'jump') {
        result = await jumpSearch(preparedArray, target, onStep, speed, executionControl)
      } else if (algorithm === 'interpolation') {
        result = await interpolationSearch(preparedArray, target, onStep, speed, executionControl)
      } else if (algorithm === 'exponential') {
        result = await exponentialSearch(preparedArray, target, onStep, speed, executionControl)
      } else if (algorithm === 'fibonacci') {
        result = await fibonacciSearch(preparedArray, target, onStep, speed, executionControl)
      } else if (algorithm === 'bfs') {
        result = await bfsSearch(preparedArray, target, onStep, speed, executionControl)
      } else {
        result = await dfsSearch(preparedArray, target, onStep, speed, executionControl)
      }

      if (result.found) {
        setFoundIndex(result.index)
        setStepMessage(`${algorithmInfo.name}: found ${target} at index ${result.index}.`)
      } else {
        setStepMessage(`${algorithmInfo.name}: ${target} not found in the dataset.`)
      }
    } catch (err) {
      if (!isSortAbortedError(err)) {
        console.error('Search failed:', err)
      }
    } finally {
      setIsRunning(false)
      setComparing([])
    }
  }, [algorithm, algorithmInfo.name, algorithmInfo.requiresSorted, array, target, speed, executionControl, applyStep, reset])

  const pauseSort = () => {
    setIsPaused(true)
    pauseSignalRef.current = true
  }

  const resumeSort = () => {
    setIsPaused(false)
    pauseSignalRef.current = false
  }

  const stepForward = () => {
    if (currentHistoryIndex < historyRef.current.length - 1) {
      const nextIdx = currentHistoryIndex + 1
      setCurrentHistoryIndex(nextIdx)
      setCurrentStep(nextIdx + 1)
      applyStep(historyRef.current[nextIdx])
    }
  }

  const stepBackward = () => {
    if (currentHistoryIndex > 0) {
      const prevIdx = currentHistoryIndex - 1
      setCurrentHistoryIndex(prevIdx)
      setCurrentStep(prevIdx + 1)
      applyStep(historyRef.current[prevIdx])
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Search guide content */}
      <div className="flex justify-center">
        <Collapsible open={resolvedGuideOpen} onOpenChange={handleGuideOpenChange} className="w-full">
          {!hideGuideToggle && (
            <div className="flex justify-center mb-2">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="text-muted-foreground text-xs hover:text-primary transition-colors">
                  <HelpCircle className="mr-2 size-3.5" />
                  Search Guide
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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
        <div className="glass-card flex flex-col justify-center border-primary/20 p-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">Comparisons</p>
          <p className="mt-1 text-xl font-bold text-primary">{stats.comparisons}</p>
        </div>
        <div className="glass-card flex flex-col justify-center border-purple-500/20 p-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">Search Steps</p>
          <p className="mt-1 text-xl font-bold text-purple-400">{stats.steps}</p>
        </div>
        <div className="glass-card flex flex-col justify-center border-blue-500/20 p-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">Search Space</p>
          <p className="mt-1 text-xl font-bold text-blue-400">
            {activeRange ? activeRange[1] - activeRange[0] + 1 : array.length}
          </p>
        </div>
        <div className="glass-card flex flex-col justify-center border-emerald-500/20 p-3 text-center overflow-hidden">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">Status</p>
          <div className="mt-1 flex items-center justify-center gap-2">
            {foundIndex !== null ? (
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Found at {foundIndex}</Badge>
            ) : isRunning ? (
              <Badge className="bg-primary/20 text-primary border-primary/30 animate-pulse">Running...</Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">Ready</Badge>
            )}
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
               <p className="mt-0.5 text-xs text-muted-foreground">Configure search parameters</p>
            </div>

            <Tabs defaultValue="search" className="w-full">
              <TabsList className="w-full rounded-none border-b border-border/20 bg-background/20 h-10 p-0">
                <TabsTrigger value="dataset" className="flex-1 rounded-none text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary border-r border-border/20">
                  <Layers className="mr-2 size-3.5" />
                  Dataset
                </TabsTrigger>
                <TabsTrigger value="search" className="flex-1 rounded-none text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                  <Search className="mr-2 size-3.5" />
                  Search
                </TabsTrigger>
              </TabsList>

              <div className="p-6">
                <TabsContent value="dataset" className="mt-0 space-y-4">
                  <DatasetGenerator 
                    onDatasetReady={handleDatasetReady} 
                    disabled={isRunning} 
                    hideTypeSelector
                    hidePreview 
                    className="!p-0 !bg-transparent !border-0 !shadow-none" 
                  />
                  <div
                    className={cn(
                      'flex gap-2 rounded-lg p-3 text-[11px]',
                      algorithmInfo.requiresSorted
                        ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                        : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                    )}
                  >
                    <Info className="size-4 shrink-0" />
                    <p>
                      {algorithmInfo.requiresSorted
                        ? `${algorithmInfo.name} requires sorted data. The dataset is auto-sorted when needed.`
                        : `${algorithmInfo.name} can run on unsorted datasets.`}
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="search" className="mt-0 space-y-7">
                  {/* Algorithm Selector */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">1. Search Algorithm</Label>
                      <Badge variant="outline" className="text-[10px] border-primary/20 text-primary">
                        {algorithmInfo.name}
                      </Badge>
                    </div>
                    <Select value={algorithm} onValueChange={handleAlgorithmChange} disabled={isRunning}>
                      <SelectTrigger className="h-10 bg-input/20 border-border/50 text-foreground transition-all focus:ring-primary/40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover/95 backdrop-blur-xl border-border/50">
                        <SelectItem value="linear">Linear Search</SelectItem>
                        <SelectItem value="binary">Binary Search</SelectItem>
                        <SelectItem value="jump">Jump Search</SelectItem>
                        <SelectItem value="interpolation">Interpolation Search</SelectItem>
                        <SelectItem value="exponential">Exponential Search</SelectItem>
                        <SelectItem value="fibonacci">Fibonacci Search</SelectItem>
                        <SelectItem value="bfs">BFS</SelectItem>
                        <SelectItem value="dfs">DFS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Target Input */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">2. Target Value</Label>
                      <Badge variant="outline" className="text-[10px] border-primary/20 text-primary">
                        Seeking: {target}
                      </Badge>
                    </div>
                    <div className="relative">
                      <Target className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        type="number"
                        value={target}
                        onChange={(e) => setTarget(Number(e.target.value))}
                        disabled={isRunning}
                        className="pl-10 h-10 bg-input/20 border-border/50 text-foreground transition-all focus:ring-primary/40"
                        placeholder="Enter value to find..."
                      />
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full text-[10px] font-bold uppercase h-8 border-border/50"
                      onClick={() => array.length > 0 && setTarget(array[Math.floor(Math.random() * array.length)])}
                      disabled={isRunning || array.length === 0}
                    >
                      Pick Random from Array
                    </Button>
                  </div>

                  {/* Playback Controls */}
                  <div className="space-y-3">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">3. Search Control</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        onClick={() => void runSearch()}
                        disabled={array.length === 0 || isRunning}
                        className="h-10 col-span-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
                      >
                        <Play className="mr-2 size-4" />
                        Start Search
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
                        Back
                      </Button>
                      <Button
                        onClick={stepForward}
                        variant="outline"
                        disabled={(!isPaused && isRunning) || (!isRunning && currentHistoryIndex >= historyRef.current.length - 1)}
                        className="h-10 border-border/50 hover:bg-primary/10 hover:border-primary/30"
                      >
                        <SkipForward className="mr-2 size-4" />
                        Next
                      </Button>
                      <Button
                        onClick={reset}
                        disabled={array.length === 0}
                        variant="outline"
                        className="h-10 col-span-2 border-border/50 hover:bg-destructive/10 hover:border-destructive/30"
                      >
                        <RotateCcw className="mr-2 size-4" />
                        Reset
                      </Button>
                    </div>
                  </div>

                  {/* Speed Controller */}
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">4. Animation Speed</Label>
                      <Badge variant="outline" className="text-[10px] border-primary/20 text-primary">
                        {speedLabel}
                      </Badge>
                    </div>
                    <Slider
                      value={[speed]}
                      onValueChange={(v) => setSpeed(v[0])}
                      min={1}
                      max={100}
                      step={1}
                      className="py-4"
                    />
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </Card>

          {/* Current State Card - REMOVED */}
        </aside>

        {/* ── Right Column: Visualization ── */}
        <main className="flex flex-col gap-4">
          <Card className="glass-card p-0 overflow-hidden flex flex-col shadow-[0_20px_50px_rgba(45,35,66,0.2)]">
            {/* Viz Header */}
            <div className="flex items-center justify-between px-6 py-3 bg-background/20 border-b border-border/20">
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-blue-500 animate-pulse" />
                <h2 className="text-base font-bold text-foreground">Search Arena</h2>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 uppercase tracking-tighter text-[10px]">
                  {algorithmInfo.name}
                </Badge>
                <div className="text-[11px] text-muted-foreground font-mono">
                  Target: {target}
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
                'bg-gradient-to-b from-input/5 to-input/10',
                isTreeMode
                  ? isBothSidebarsCollapsed
                    ? 'h-[34rem] px-4 py-4'
                    : 'h-[28rem] px-4 py-4'
                  : 'h-80 flex items-end justify-center px-6 py-5 gap-0.5 sm:gap-1'
              )}
            >
              {array.length === 0 ? (
                <div className="flex flex-col items-center gap-4 text-center opacity-50">
                  <Layers className="size-12" />
                  <div>
                    <p className="text-lg font-bold">Workspace Empty</p>
                    <p className="text-sm">Generate a dataset to begin searching.</p>
                  </div>
                </div>
              ) : isTreeMode ? (
                <div className="relative h-full w-full overflow-x-auto overflow-y-hidden rounded-lg border border-border/20 bg-background/20">
                  <div className="h-full w-full min-w-[700px]">
                    <svg
                      viewBox={`0 0 ${treeViewboxWidth} ${treeViewboxHeight}`}
                      className="h-full w-full"
                      preserveAspectRatio="xMinYMin meet"
                      role="img"
                      aria-label={`${algorithmInfo.name} tree visualization`}
                    >
                      {treeEdges.map((edge) => (
                        <line
                          key={`${edge.parent.index}-${edge.child.index}`}
                          x1={edge.parent.x}
                          y1={edge.parent.y + treeNodeRadius - 1}
                          x2={edge.child.x}
                          y2={edge.child.y - treeNodeRadius + 1}
                          stroke="rgba(148, 163, 184, 0.45)"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      ))}

                      {treeNodes.map((node) => {
                        const nodeFill = node.isFound
                          ? 'rgb(34, 197, 94)'
                          : node.isCurrent
                            ? 'rgb(250, 204, 21)'
                            : node.isInRange
                              ? 'rgb(59, 130, 246)'
                              : 'rgb(71, 85, 105)'

                        const nodeStroke = node.isFound
                          ? 'rgba(16, 185, 129, 0.9)'
                          : node.isCurrent
                            ? 'rgba(250, 204, 21, 0.9)'
                            : 'rgba(148, 163, 184, 0.45)'

                        return (
                          <g key={node.index} transform={`translate(${node.x}, ${node.y})`}>
                            <circle r={treeNodeRadius} fill={nodeFill} stroke={nodeStroke} strokeWidth="2" />
                            <text
                              y={treeValueBaselineOffset}
                              textAnchor="middle"
                              fill="rgba(255, 255, 255, 0.95)"
                              stroke="rgba(15, 23, 42, 0.6)"
                              strokeWidth={treeValueStrokeWidth}
                              paintOrder="stroke"
                              style={{ fontSize: `${treeValueFontSize}px`, fontWeight: 800 }}
                            >
                              {node.value}
                            </text>
                            {node.showIndex && (
                              <text
                                y={treeNodeRadius + 12}
                                textAnchor="middle"
                                fill="rgba(148, 163, 184, 0.9)"
                                style={{ fontSize: `${treeIndexFontSize}px`, fontWeight: 700 }}
                              >
                                #{node.index}
                              </text>
                            )}
                          </g>
                        )
                      })}
                    </svg>
                  </div>

                  {array.length > treeNodeCount && (
                    <div className="pointer-events-none absolute bottom-2 right-2 rounded-md border border-border/40 bg-background/70 px-2 py-1 text-[10px] font-semibold text-muted-foreground backdrop-blur-sm">
                      Showing first {treeNodeCount} nodes
                    </div>
                  )}
                </div>
              ) : (
                array.map((value, idx) => {
                  const isMid = comparing.length > 2 && comparing[2] === idx
                  const isCurrent = comparing.length > 2 ? isMid : comparing.includes(idx)
                  const isLow = activeRange && activeRange[0] === idx
                  const isHigh = activeRange && activeRange[1] === idx
                  const isInRange = activeRange && idx >= activeRange[0] && idx <= activeRange[1]
                  const isFound = foundIndex === idx
                  const shouldShowLabel =
                    array.length <= 40 &&
                    (idx % labelInterval === 0 || isCurrent || isFound || isLow || isHigh)
                  
                  return (
                    <div
                      key={idx}
                      className="relative flex h-full min-w-0 flex-1 items-end"
                      style={{ flex: '1' }}
                    >
                      <motion.div
                        className="w-full rounded-t-md transition-shadow"
                        animate={{
                          height: `${(value / maxValue) * 100}%`,
                          backgroundColor: isFound
                            ? 'rgb(34, 197, 94)'
                            : isCurrent
                              ? 'rgb(250, 204, 21)'
                            : 'rgb(59, 130, 246)', // Blue for all unsearched
                          boxShadow: isCurrent
                            ? '0 0 16px rgba(250, 204, 21, 0.6)'
                            : isFound
                              ? '0 0 16px rgba(34, 197, 94, 0.5)'
                              : '0 4px 12px rgba(59, 130, 246, 0.2)',
                          opacity: (activeRange && !isInRange) ? 0.25 : 1,
                        }}
                        transition={{
                          type: 'spring',
                          damping: 18,
                          stiffness: 230,
                        }}
                      />
                      {shouldShowLabel && (
                         <span className={cn(
                           "pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] font-mono font-bold whitespace-nowrap",
                           isFound ? "text-emerald-400" : isCurrent ? "text-yellow-400" : (isLow || isHigh) ? "text-blue-400" : "text-foreground/85"
                         )}>
                           {isFound
                             ? `✓ ${value}`
                             : isCurrent && comparing.length > 2
                               ? `${algorithm === 'binary' ? 'M' : algorithm === 'interpolation' ? 'P' : 'C'}: ${value}`
                               : isLow
                                 ? `L: ${value}`
                                 : isHigh
                                   ? `H: ${value}`
                                   : value}
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
                    <span className="text-[9px] uppercase font-bold text-muted-foreground">
                      {isTreeMode
                        ? 'Tree Nodes'
                        : algorithmInfo.requiresSorted
                          ? 'In Search Space'
                          : 'Candidate Values'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="size-2 rounded-full bg-yellow-400 shadow-lg shadow-yellow-400/50" />
                    <span className="text-[9px] uppercase font-bold text-muted-foreground">
                      {isTreeMode
                        ? 'Current Node'
                        : algorithm === 'binary'
                          ? 'Current Mid'
                          : algorithm === 'interpolation'
                            ? 'Probe Index'
                            : 'Current Check'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        'size-2 rounded-full shadow-lg',
                        isTreeMode ? 'bg-slate-400 shadow-slate-400/50' : 'bg-slate-800 shadow-slate-800/50'
                      )}
                    />
                    <span className="text-[9px] uppercase font-bold text-muted-foreground">
                      {isTreeMode ? 'Parent/Child Links' : 'Discarded'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="size-2 rounded-full bg-green-500 shadow-lg shadow-green-500/50" />
                    <span className="text-[9px] uppercase font-bold text-muted-foreground">Result Found</span>
                  </div>
               </div>
            </div>

            {/* Search Theory - Compact Version */}
            <div className="px-6 py-3 bg-primary/5 border-t border-primary/10">
              <h3 className="text-base font-bold text-primary mb-2">{algorithmInfo.name} Theory</h3>
              <p className="text-sm text-foreground/70 leading-relaxed mb-3">
                {algorithmInfo.description}
              </p>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="p-2 rounded-lg border border-border/20 bg-background/30 flex flex-col gap-0.5">
                  <span className="text-[9px] uppercase font-bold text-muted-foreground">Worst</span>
                  <span className="text-sm font-bold text-red-400 font-mono">{algorithmInfo.worstCase}</span>
                </div>
                <div className="p-2 rounded-lg border border-border/20 bg-background/30 flex flex-col gap-0.5">
                  <span className="text-[9px] uppercase font-bold text-muted-foreground">Avg</span>
                  <span className="text-sm font-bold text-blue-400 font-mono">{algorithmInfo.averageCase}</span>
                </div>
                <div className="p-2 rounded-lg border border-border/20 bg-background/30 flex flex-col gap-0.5">
                  <span className="text-[9px] uppercase font-bold text-muted-foreground">Best</span>
                  <span className="text-sm font-bold text-emerald-400 font-mono">{algorithmInfo.bestCase}</span>
                </div>
              </div>
              
              {/* Space Complexity */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/10">
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[9px] uppercase font-bold text-muted-foreground">Space</span>
                  <span className="text-sm font-bold text-purple-400 font-mono">{algorithmInfo.spaceComplexity}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[9px] uppercase font-bold text-muted-foreground">Found</span>
                  <Badge variant="outline" className={cn('text-[7px] h-5', foundIndex !== null ? 'bg-emerald-400/20 text-emerald-400 border-emerald-400/50' : 'bg-background/30')}>
                    {foundIndex !== null ? '✓ Found' : 'Searching...'}
                  </Badge>
                </div>
              </div>
            </div>
          </Card>
        </main>
      </div>

      {/* Dataset (Full Width) */}
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
                  className="inline-flex items-center gap-1 rounded-md border border-border/50 bg-background/45 px-2 py-1"
                >
                  <span className="text-[10px] text-muted-foreground">[{index}]</span>
                  <span className="font-mono text-[11px] font-semibold text-foreground/90">{value}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </Card>

    </div>
  )
}
