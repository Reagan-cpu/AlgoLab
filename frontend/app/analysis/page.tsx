'use client'

import React, { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts'
import { WorkspaceShell } from '@/components/layout/workspace-shell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { Play, BarChart3 } from 'lucide-react'

type AnalysisAlgorithmKey =
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

type TimeMetricKey = `${AnalysisAlgorithmKey}Time`
type OpsMetricKey = `${AnalysisAlgorithmKey}Ops`

type AnalysisData = {
  size: number
} & Record<TimeMetricKey, number> & Record<OpsMetricKey, number>

type AnalysisRunner = (
  array: number[],
  onStep: (step: SortStep) => void,
  speed?: number
) => Promise<{ array: number[]; comparisons: number; operations: number }>

interface AnalysisAlgorithmConfig {
  key: AnalysisAlgorithmKey
  label: string
  color: string
  complexity: string
  complexityHint: string
  run: AnalysisRunner
}

const ANALYSIS_ALGORITHMS: AnalysisAlgorithmConfig[] = [
  {
    key: 'bubble',
    label: 'Bubble Sort',
    color: 'rgb(248, 113, 113)',
    complexity: 'O(n^2)',
    complexityHint: 'Worst/Average',
    run: bubbleSort,
  },
  {
    key: 'selection',
    label: 'Selection Sort',
    color: 'rgb(251, 146, 60)',
    complexity: 'O(n^2)',
    complexityHint: 'All cases',
    run: selectionSort,
  },
  {
    key: 'insertion',
    label: 'Insertion Sort',
    color: 'rgb(250, 204, 21)',
    complexity: 'O(n^2)',
    complexityHint: 'Worst/Average',
    run: insertionSort,
  },
  {
    key: 'merge',
    label: 'Merge Sort',
    color: 'rgb(168, 85, 247)',
    complexity: 'O(n log n)',
    complexityHint: 'All cases',
    run: mergeSort,
  },
  {
    key: 'quick',
    label: 'Quick Sort',
    color: 'rgb(59, 130, 246)',
    complexity: 'O(n log n)',
    complexityHint: 'Average case',
    run: quickSort,
  },
  {
    key: 'heap',
    label: 'Heap Sort',
    color: 'rgb(16, 185, 129)',
    complexity: 'O(n log n)',
    complexityHint: 'All cases',
    run: heapSort,
  },
  {
    key: 'shell',
    label: 'Shell Sort',
    color: 'rgb(6, 182, 212)',
    complexity: 'O(n^2)',
    complexityHint: 'Gap-dependent',
    run: shellSort,
  },
  {
    key: 'counting',
    label: 'Counting Sort',
    color: 'rgb(236, 72, 153)',
    complexity: 'O(n + k)',
    complexityHint: 'Integer ranges',
    run: countingSort,
  },
  {
    key: 'radix',
    label: 'Radix Sort',
    color: 'rgb(99, 102, 241)',
    complexity: 'O(d*(n + k))',
    complexityHint: 'Digit-based',
    run: radixSort,
  },
  {
    key: 'bucket',
    label: 'Bucket Sort',
    color: 'rgb(20, 184, 166)',
    complexity: 'O(n + k)',
    complexityHint: 'Average case',
    run: bucketSort,
  },
]

const BENCHMARK_SIZES = [10, 25, 50, 75, 100]
const BENCHMARK_SPEED = 120

function timeKeyFor(key: AnalysisAlgorithmKey): TimeMetricKey {
  return `${key}Time` as TimeMetricKey
}

function opsKeyFor(key: AnalysisAlgorithmKey): OpsMetricKey {
  return `${key}Ops` as OpsMetricKey
}

function createEmptyRow(size: number): AnalysisData {
  const row = { size } as AnalysisData

  for (const algorithm of ANALYSIS_ALGORITHMS) {
    row[timeKeyFor(algorithm.key)] = 0
    row[opsKeyFor(algorithm.key)] = 0
  }

  return row
}

export default function AnalysisPage() {
  const [data, setData] = useState<AnalysisData[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [progress, setProgress] = useState(0)

  const runAnalysis = useCallback(async () => {
    setIsAnalyzing(true)
    setProgress(0)
    const results: AnalysisData[] = []

    const totalRuns = BENCHMARK_SIZES.length * ANALYSIS_ALGORITHMS.length
    let completedRuns = 0

    for (const size of BENCHMARK_SIZES) {
      const analysisData = createEmptyRow(size)
      const baseArray = generateRandomArray(size)

      for (const algorithm of ANALYSIS_ALGORITHMS) {
        const benchmarkArray = [...baseArray]
        let operations = 0

        const startTime = performance.now()
        await algorithm.run(
          benchmarkArray,
          (step: SortStep) => {
            operations = step.operations
          },
          BENCHMARK_SPEED
        )

        analysisData[timeKeyFor(algorithm.key)] = Math.round(performance.now() - startTime)
        analysisData[opsKeyFor(algorithm.key)] = operations

        completedRuns += 1
        setProgress(Math.round((completedRuns / totalRuns) * 100))
      }

      results.push(analysisData)
      setData([...results])
    }

    setIsAnalyzing(false)
  }, [])

  return (
    <WorkspaceShell
      title="Performance Analysis"
      description="Generate benchmarks across input sizes to study execution-time and operation growth."
    >
      <div className="space-y-8">
        {/* Control Card */}
        <Card className="glass-card mb-8">
          <h2 className="text-xl font-bold text-foreground mb-4">Analysis Control</h2>
          <p className="text-foreground/60 mb-6">
            Run a comprehensive performance analysis on all sorting algorithms with array sizes from 10 to 100 elements.
          </p>
          <Button
            onClick={runAnalysis}
            disabled={isAnalyzing}
            className="bg-primary hover:bg-primary/90 text-foreground"
          >
            <Play className="w-4 h-4 mr-2" />
            {isAnalyzing ? `Running... ${progress}%` : 'Start Analysis'}
          </Button>
        </Card>

        {/* Complexity Reference */}
        <Card className="glass-card mb-8">
          <h2 className="text-xl font-bold text-foreground mb-4">Complexity Classes</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            {ANALYSIS_ALGORITHMS.map((algorithm, index) => (
              <motion.div
                key={algorithm.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="glass p-4 rounded-lg"
              >
                <p className="font-semibold" style={{ color: algorithm.color }}>
                  {algorithm.label}
                </p>
                <p className="text-foreground/60 text-sm mt-2">
                  <span className="font-mono">{algorithm.complexity}</span>
                </p>
                <p className="text-foreground/60 text-xs mt-1">{algorithm.complexityHint}</p>
              </motion.div>
            ))}
          </div>
        </Card>

        {/* Charts */}
        {data.length > 0 && (
          <>
            {/* Execution Time Chart */}
            <Card className="glass-card mb-8">
              <h2 className="text-xl font-bold text-foreground mb-6">
                <BarChart3 className="w-5 h-5 inline mr-2" />
                Execution Time Comparison (ms)
              </h2>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="size" stroke="rgba(255,255,255,0.5)" />
                  <YAxis stroke="rgba(255,255,255,0.5)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 12, 63, 0.9)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'rgb(248, 248, 248)' }}
                  />
                  <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.7)' }} />
                  {ANALYSIS_ALGORITHMS.map((algorithm) => (
                    <Line
                      key={`${algorithm.key}-time`}
                      type="monotone"
                      dataKey={timeKeyFor(algorithm.key)}
                      stroke={algorithm.color}
                      name={algorithm.label}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </ComposedChart>
              </ResponsiveContainer>
            </Card>

            {/* Operations Chart */}
            <Card className="glass-card mb-8">
              <h2 className="text-xl font-bold text-foreground mb-6">
                <BarChart3 className="w-5 h-5 inline mr-2" />
                Operations Count Comparison
              </h2>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="size" stroke="rgba(255,255,255,0.5)" />
                  <YAxis stroke="rgba(255,255,255,0.5)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 12, 63, 0.9)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'rgb(248, 248, 248)' }}
                  />
                  <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.7)' }} />
                  {ANALYSIS_ALGORITHMS.map((algorithm) => (
                    <Line
                      key={`${algorithm.key}-ops`}
                      type="monotone"
                      dataKey={opsKeyFor(algorithm.key)}
                      stroke={algorithm.color}
                      name={algorithm.label}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </ComposedChart>
              </ResponsiveContainer>
            </Card>

            {/* Results Table */}
            <Card className="glass-card">
              <h2 className="text-xl font-bold text-foreground mb-4">Detailed Results</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30">
                      <th className="text-left py-3 px-4 text-foreground">Array Size</th>
                      {ANALYSIS_ALGORITHMS.map((algorithm) => (
                        <th
                          key={`${algorithm.key}-time-header`}
                          className="text-left py-3 px-4"
                          style={{ color: algorithm.color }}
                        >
                          {algorithm.label} Time (ms)
                        </th>
                      ))}
                      {ANALYSIS_ALGORITHMS.map((algorithm) => (
                        <th
                          key={`${algorithm.key}-ops-header`}
                          className="text-left py-3 px-4 text-foreground/70"
                        >
                          {algorithm.label} Ops
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row, idx) => (
                      <motion.tr
                        key={idx}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        className="border-b border-border/10 hover:bg-card/30"
                      >
                        <td className="py-3 px-4 font-mono text-foreground">{row.size}</td>
                        {ANALYSIS_ALGORITHMS.map((algorithm) => (
                          <td
                            key={`${idx}-${algorithm.key}-time`}
                            className="py-3 px-4 font-mono"
                            style={{ color: algorithm.color }}
                          >
                            {row[timeKeyFor(algorithm.key)]}
                          </td>
                        ))}
                        {ANALYSIS_ALGORITHMS.map((algorithm) => (
                          <td
                            key={`${idx}-${algorithm.key}-ops`}
                            className="py-3 px-4 font-mono text-foreground/60"
                          >
                            {row[opsKeyFor(algorithm.key)]}
                          </td>
                        ))}
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}

        {/* Empty State */}
        {data.length === 0 && !isAnalyzing && (
          <Card className="glass-card p-12 text-center">
            <BarChart3 className="w-16 h-16 mx-auto text-foreground/30 mb-4" />
            <p className="text-foreground/60">
              Click the button above to run a comprehensive performance analysis
            </p>
          </Card>
        )}
      </div>
    </WorkspaceShell>
  )
}
