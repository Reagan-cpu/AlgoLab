'use client'

import React, { useState } from 'react'
import { WorkspaceShell } from '@/components/layout/workspace-shell'
import { BinarySearchVisualizer } from '@/components/binary-search-visualizer'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ChevronDown, HelpCircle } from 'lucide-react'

export default function BinarySearchPage() {
  const [isGuideOpen, setIsGuideOpen] = useState(false)

  return (
    <WorkspaceShell
      title="Search Algorithms Visualizer"
      description="Visualize the logarithmic efficiency of searching in sorted data"
      headerAction={(
        <Button
          variant="ghost"
          className="text-muted-foreground text-xs hover:text-primary transition-colors"
          onClick={() => setIsGuideOpen((previous) => !previous)}
        >
          <HelpCircle className="mr-2 size-3.5" />
          Search Guide
          <ChevronDown className={cn('ml-1.5 size-3.5 transition-transform', isGuideOpen && 'rotate-180')} />
        </Button>
      )}
      rightPanel={(
        <section className="rounded-xl border border-border/30 bg-background/35 p-3">
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Search Tips
          </h3>
          <ul className="mt-2 space-y-1.5 text-xs text-foreground/90">
            <li>1. Select the search algorithm before running.</li>
            <li>2. For sorted algorithms, let the tool auto-sort the dataset.</li>
            <li>3. Use Pause + Next to inspect index movement step-by-step.</li>
            <li>4. For BFS/DFS, keep dataset size moderate for a clearer tree view.</li>
          </ul>

          <div className="mt-3 rounded-lg border border-border/30 bg-background/40 p-2.5 text-xs text-foreground/80">
            <p className="font-semibold text-foreground">Pro Tip</p>
            <p className="mt-1">Use a present value first to understand traversal, then test a missing value to observe complete exploration.</p>
          </div>
        </section>
      )}
    >
      <BinarySearchVisualizer
        guideOpen={isGuideOpen}
        onGuideOpenChange={setIsGuideOpen}
        hideGuideToggle
      />
    </WorkspaceShell>
  )
}
