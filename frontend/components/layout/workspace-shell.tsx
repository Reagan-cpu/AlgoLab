import type { ReactNode } from 'react'
import { useState } from 'react'

import { DashboardNav } from '@/components/dashboard-nav'
import { RightInfoPanel } from '@/components/layout/right-info-panel'
import { WorkspaceSidebar } from '@/components/layout/workspace-sidebar'
import { cn } from '@/lib/utils'

interface WorkspaceShellProps {
  title: string
  description: string
  children: ReactNode
  rightPanel?: ReactNode
  contentClassName?: string
  headerAction?: ReactNode
}

export function WorkspaceShell({
  title,
  description,
  children,
  rightPanel,
  contentClassName,
  headerAction,
}: WorkspaceShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true)

  return (
    <main className="gradient-mesh min-h-screen">
      <DashboardNav
        onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
        onRightSidebarToggle={() => setRightSidebarOpen((previous) => !previous)}
        rightSidebarOpen={rightSidebarOpen}
      />

      <div className="mx-auto max-w-[1600px] px-3 pb-8 pt-6 sm:px-4 lg:px-5">
        <div className={cn(
          'grid gap-4 transition-all duration-300',
          sidebarOpen
            ? rightSidebarOpen
              ? 'lg:grid-cols-[4.2rem_minmax(0,1fr)] xl:grid-cols-[12.75rem_minmax(0,1fr)] 2xl:grid-cols-[12.75rem_minmax(0,1fr)_17.5rem]'
              : 'lg:grid-cols-[4.2rem_minmax(0,1fr)] xl:grid-cols-[12.75rem_minmax(0,1fr)] 2xl:grid-cols-[12.75rem_minmax(0,1fr)]'
            : rightSidebarOpen
              ? '2xl:grid-cols-[minmax(0,1fr)_17.5rem]'
              : '2xl:grid-cols-[minmax(0,1fr)]'
        )}>
          {sidebarOpen && <WorkspaceSidebar className="hidden lg:block" />}

          <section
            data-both-sidebars-collapsed={!sidebarOpen && !rightSidebarOpen ? 'true' : 'false'}
            className={cn(
              'min-w-0 rounded-2xl border border-border/40 bg-background/35 p-5 shadow-[0_8px_26px_rgba(0,0,0,0.16)] backdrop-blur-2xl sm:p-6',
              contentClassName
            )}
          >
            <header className="mb-6 border-b border-border/30 pb-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h1>
                  <p className="mt-1.5 text-sm text-muted-foreground sm:text-base">{description}</p>
                </div>

                {headerAction && (
                  <div className="shrink-0 self-start">{headerAction}</div>
                )}
              </div>
            </header>

            {children}
          </section>

          {rightSidebarOpen && (
            <RightInfoPanel className="hidden 2xl:block">{rightPanel}</RightInfoPanel>
          )}
        </div>
      </div>
    </main>
  )
}
