'use client'

import React, { useCallback, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertCircle,
  ArrowDownWideNarrow,
  ArrowUpDown,
  BarChart3,
  ListOrdered,
  PencilLine,
  RefreshCw,
  Shuffle,
  Sparkles,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type DatasetSource = 'random' | 'custom'
export type DatasetType =
  | 'random'
  | 'nearly-sorted'
  | 'reverse-sorted'
  | 'few-unique'
  | 'already-sorted'

export interface DatasetGeneratorMeta {
  source: DatasetSource
  arraySize: number
  datasetType?: DatasetType
  valueRange?: {
    min: number
    max: number
  }
}

interface DatasetGeneratorProps {
  onDatasetReady: (data: number[], meta: DatasetGeneratorMeta) => void
  disabled?: boolean
  className?: string
  hideTypeSelector?: boolean
  hidePreview?: boolean
}

const RANDOM_MIN_SIZE = 5
const RANDOM_MAX_SIZE = 100

const DATASET_TYPE_OPTIONS: Array<{
  value: DatasetType
  label: string
  icon: React.ReactNode
}> = [
  {
    value: 'random',
    label: 'Random',
    icon: <Shuffle className="size-3.5" />,
  },
  {
    value: 'nearly-sorted',
    label: 'Nearly Sorted',
    icon: <ArrowUpDown className="size-3.5" />,
  },
  {
    value: 'reverse-sorted',
    label: 'Reverse Sorted',
    icon: <ArrowDownWideNarrow className="size-3.5" />,
  },
  {
    value: 'few-unique',
    label: 'Few Unique',
    icon: <BarChart3 className="size-3.5" />,
  },
  {
    value: 'already-sorted',
    label: 'Already Sorted',
    icon: <ListOrdered className="size-3.5" />,
  },
]

function parseCustomArray(input: string): { values: number[]; error: string | null } {
  const trimmedInput = input.trim()

  if (!trimmedInput) {
    return { values: [], error: 'Please enter at least one number.' }
  }

  const tokens = trimmedInput.split(',').map((token) => token.trim())

  if (tokens.some((token) => token.length === 0)) {
    return {
      values: [],
      error: 'Comma-separated input cannot contain empty values.',
    }
  }

  const invalidToken = tokens.find((token) => !/^-?\d+(\.\d+)?$/.test(token))
  if (invalidToken) {
    return {
      values: [],
      error: `"${invalidToken}" is invalid. Use only numbers separated by commas.`,
    }
  }

  const values = tokens.map((token) => Number(token))

  if (values.length < 2) {
    return {
      values: [],
      error: 'Please enter at least two numbers for visualization.',
    }
  }

  if (values.length > 100) {
    return {
      values: [],
      error: 'Custom dataset can contain at most 100 numbers.',
    }
  }

  return { values, error: null }
}

function createRandomDataset(size: number, min: number, max: number): number[] {
  return Array.from({ length: size }, () =>
    Math.floor(Math.random() * (max - min + 1)) + min
  )
}

function createNearlySortedDataset(size: number, min: number, max: number): number[] {
  const sorted = Array.from({ length: size }, (_, index) =>
    min + Math.floor(((max - min) * index) / Math.max(size - 1, 1))
  )

  const swapCount = Math.max(1, Math.floor(size * 0.1))
  for (let i = 0; i < swapCount; i += 1) {
    const first = Math.floor(Math.random() * size)
    const second = Math.floor(Math.random() * size)
    ;[sorted[first], sorted[second]] = [sorted[second], sorted[first]]
  }

  return sorted
}

function createReverseSortedDataset(size: number, min: number, max: number): number[] {
  const base = Array.from({ length: size }, (_, index) =>
    min + Math.floor(((max - min) * index) / Math.max(size - 1, 1))
  )

  return base.reverse()
}

function createFewUniqueDataset(size: number, min: number, max: number): number[] {
  const uniqueCount = Math.max(3, Math.floor(Math.min(size, 10) / 2))
  const bucket = Array.from({ length: uniqueCount }, () =>
    Math.floor(Math.random() * (max - min + 1)) + min
  )

  return Array.from({ length: size }, () => bucket[Math.floor(Math.random() * bucket.length)])
}

function createAlreadySortedDataset(size: number, min: number, max: number): number[] {
  return Array.from({ length: size }, (_, index) =>
    min + Math.floor(((max - min) * index) / Math.max(size - 1, 1))
  )
}

function createDatasetByType(type: DatasetType, size: number, min: number, max: number): number[] {
  switch (type) {
    case 'nearly-sorted':
      return createNearlySortedDataset(size, min, max)
    case 'reverse-sorted':
      return createReverseSortedDataset(size, min, max)
    case 'few-unique':
      return createFewUniqueDataset(size, min, max)
    case 'already-sorted':
      return createAlreadySortedDataset(size, min, max)
    default:
      return createRandomDataset(size, min, max)
  }
}

export function DatasetGenerator({
  onDatasetReady,
  disabled = false,
  className,
  hideTypeSelector = false,
  hidePreview = false,
}: DatasetGeneratorProps) {
  const [arraySize, setArraySize] = useState(30)
  const [minValue, setMinValue] = useState(1)
  const [maxValue, setMaxValue] = useState(100)
  const [datasetType, setDatasetType] = useState<DatasetType>('random')
  const [customInput, setCustomInput] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [preview, setPreview] = useState<number[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [lastConfig, setLastConfig] = useState<{
    datasetType: DatasetType
    arraySize: number
    minValue: number
    maxValue: number
  } | null>(null)

  const randomRangeIsValid = useMemo(() => {
    return Number.isFinite(minValue) && Number.isFinite(maxValue) && minValue < maxValue
  }, [minValue, maxValue])

  const datasetStats = useMemo(() => {
    if (preview.length === 0) {
      return {
        size: 0,
        min: 0,
        max: 0,
      }
    }

    return {
      size: preview.length,
      min: Math.min(...preview),
      max: Math.max(...preview),
    }
  }, [preview])

  const handleRandomGenerate = useCallback(() => {
    if (!randomRangeIsValid) {
      setErrorMessage('Value range is invalid. Ensure minimum is less than maximum.')
      return
    }

    const generated = createDatasetByType(datasetType, arraySize, minValue, maxValue)
    setPreview(generated)
    setShowCustomInput(false)
    setErrorMessage(null)
    setLastConfig({ datasetType, arraySize, minValue, maxValue })
    onDatasetReady(generated, {
      source: 'random',
      arraySize,
      datasetType,
      valueRange: { min: minValue, max: maxValue },
    })
  }, [arraySize, datasetType, maxValue, minValue, onDatasetReady, randomRangeIsValid])

  const handleRegenerate = useCallback(() => {
    if (!lastConfig) {
      setErrorMessage('Generate a dataset first, then you can regenerate it.')
      return
    }

    const generated = createDatasetByType(
      lastConfig.datasetType,
      lastConfig.arraySize,
      lastConfig.minValue,
      lastConfig.maxValue
    )

    setPreview(generated)
    setShowCustomInput(false)
    setErrorMessage(null)
    onDatasetReady(generated, {
      source: 'random',
      arraySize: lastConfig.arraySize,
      datasetType: lastConfig.datasetType,
      valueRange: { min: lastConfig.minValue, max: lastConfig.maxValue },
    })
  }, [lastConfig, onDatasetReady])

  const handleCustomApply = useCallback(() => {
    const { values, error } = parseCustomArray(customInput)

    if (error) {
      setErrorMessage(error)
      return
    }

    setPreview(values)
    setArraySize(values.length)
    setErrorMessage(null)
    setLastConfig(null)
    onDatasetReady(values, {
      source: 'custom',
      arraySize: values.length,
    })
  }, [customInput, onDatasetReady])

  return (
    <Card className={cn('glass-card space-y-3 p-4', className)}>
      <h2 className="text-base font-semibold text-foreground">Dataset Generator</h2>

      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
        <Button
          type="button"
          size="sm"
          className="h-9 rounded-lg bg-primary px-2 text-[11px] text-primary-foreground hover:bg-primary/90 [&_svg]:size-3.5"
          onClick={handleRandomGenerate}
          disabled={disabled}
        >
          <Shuffle className="size-4" />
          Generate Random
        </Button>

        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 rounded-lg border-border/50 bg-background/20 px-2 text-[11px] [&_svg]:size-3.5"
          onClick={handleRegenerate}
          disabled={disabled || !lastConfig}
        >
          <RefreshCw className="size-4" />
          Regenerate
        </Button>

        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 rounded-lg border-border/50 bg-background/20 px-2 text-[11px] [&_svg]:size-3.5"
          onClick={() => setShowCustomInput((open) => !open)}
          disabled={disabled}
        >
          <PencilLine className="size-4" />
          Custom Input
        </Button>
      </div>

      {!hideTypeSelector && (
        <div className="space-y-2 rounded-lg border border-border/30 bg-background/20 p-3">
          <Label className="text-xs font-medium uppercase tracking-[0.14em] text-foreground/80">Dataset Type</Label>
          <div className="flex flex-wrap gap-2">
            {DATASET_TYPE_OPTIONS.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={datasetType === option.value ? 'default' : 'outline'}
                className={cn(
                  'h-8 rounded-full px-2.5 text-[11px]',
                  datasetType === option.value
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'border-border/50 bg-background/20'
                )}
                disabled={disabled}
                onClick={() => setDatasetType(option.value)}
              >
                {option.icon}
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 rounded-lg border border-border/30 bg-background/20 p-3 md:grid-cols-[minmax(0,1fr)_5.8rem_5.8rem]">
        <div className="space-y-1.5">
          <Label className="text-sm text-foreground">Array Size: {arraySize}</Label>
          <Slider
            value={[arraySize]}
            onValueChange={(value) => setArraySize(value[0])}
            min={RANDOM_MIN_SIZE}
            max={RANDOM_MAX_SIZE}
            step={1}
            disabled={disabled}
          />
          <p className="text-[11px] text-foreground/60">Size range: 5 to 100 values</p>
        </div>

        <div className="space-y-1">
          <div className="space-y-1">
            <Label className="text-[11px] text-foreground/80">Min</Label>
            <Input
              type="number"
              value={minValue}
              onChange={(event) => setMinValue(Number(event.target.value))}
              disabled={disabled}
              className="h-8 bg-input/40"
            />
          </div>
        </div>

        <div className="space-y-1">
          <div className="space-y-1">
            <Label className="text-[11px] text-foreground/80">Max</Label>
            <Input
              type="number"
              value={maxValue}
              onChange={(event) => setMaxValue(Number(event.target.value))}
              disabled={disabled}
              className="h-8 bg-input/40"
            />
          </div>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {showCustomInput && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-2 rounded-lg border border-border/30 bg-background/20 p-3"
          >
            <Label htmlFor="custom-array-input" className="text-foreground">
              Enter comma-separated numbers
            </Label>
            <Input
              id="custom-array-input"
              value={customInput}
              onChange={(event) => setCustomInput(event.target.value)}
              placeholder="Example: 5, 2, 9, 1, 6, 3"
              disabled={disabled}
              className="bg-input/40"
            />
            <p className="text-xs text-foreground/60">Only numbers are allowed.</p>
            <Button
              type="button"
              size="sm"
              className="rounded-lg"
              onClick={handleCustomApply}
              disabled={disabled}
            >
              <Sparkles className="size-4" />
              Apply Custom Dataset
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {errorMessage && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4" />
          <span>{errorMessage}</span>
        </div>
      )}

      {!hidePreview && (
        <div className="rounded-lg border border-border/30 bg-background/20 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Dataset Preview</p>
            <Badge variant="outline" className="border-border/50 bg-background/30 text-[11px] text-foreground/75">
              {datasetStats.size > 0
                ? `${datasetStats.size} items | min ${datasetStats.min} | max ${datasetStats.max}`
                : 'No data'}
            </Badge>
          </div>
          {preview.length === 0 ? (
            <p className="text-sm text-foreground/60">No dataset generated yet.</p>
          ) : (
            <div className="rounded-lg border border-border/40 bg-background/30 p-2.5">
              <div className="flex flex-wrap gap-1.5">
                {preview.map((value, index) => (
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
        </div>
      )}
    </Card>
  )
}
