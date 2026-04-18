'use client'

import React, { useState } from 'react'
import { AlgorithmVisualizer } from '@/components/algorithm-visualizer'
import { WorkspaceShell } from '@/components/layout/workspace-shell'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ChevronDown, HelpCircle } from 'lucide-react'

export default function VisualizerPage() {
  const [isGuideOpen, setIsGuideOpen] = useState(false)

  return (
    <WorkspaceShell
      title="Sorting Algorithm Visualizer"
      description="A beginner-first workspace to generate datasets, run sorting algorithms, and understand every operation step-by-step."
      headerAction={(
        <Button
          variant="ghost"
          className="text-muted-foreground text-xs hover:text-primary transition-colors"
          onClick={() => setIsGuideOpen((previous) => !previous)}
        >
          <HelpCircle className="mr-2 size-3.5" />
          Need help? View the Beginner's Guide
          <ChevronDown className={cn('ml-1.5 size-3.5 transition-transform', isGuideOpen && 'rotate-180')} />
        </Button>
      )}
      rightPanel={(
        <section className="rounded-xl border border-border/30 bg-background/35 p-3">
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Learning Tips
          </h3>
          <ul className="mt-2 space-y-1.5 text-xs text-foreground/90">
            <li>1. Pick dataset type, then generate values.</li>
            <li>2. Start with Bubble Sort for easier pattern recognition.</li>
            <li>3. Use Pause + Step Forward to inspect each comparison.</li>
            <li>4. Read the step explanation before moving on.</li>
          </ul>

          <div className="mt-3 rounded-lg border border-border/30 bg-background/40 p-2.5 text-xs text-foreground/80">
            <p className="font-semibold text-foreground">Pro Tip</p>
            <p className="mt-1">Set speed toward Slow while learning, then increase toward Fast to compare algorithm behavior.</p>
          </div>
        </section>
      )}
    >
      <div className="space-y-6">
        <AlgorithmVisualizer
          guideOpen={isGuideOpen}
          onGuideOpenChange={setIsGuideOpen}
          hideGuideToggle
        />
        </div>
    </WorkspaceShell>
  )
}
