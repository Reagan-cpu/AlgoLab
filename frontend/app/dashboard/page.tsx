'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ArrowRight,
  BarChart2,
  Clock,
  FileText,
  FlaskConical,
  Gauge,
  Layers,
  Search,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react'

import { WorkspaceShell } from '@/components/layout/workspace-shell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  AuthUser,
  ExperimentRecord,
  getCurrentUser,
  listExperiments,
  listReports,
} from '@/lib/api'

/* ─── helpers ─────────────────────────────────────────────── */
function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatMs(ms: number) {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)} s`
  return `${ms} ms`
}

const ALGO_COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
]

const MODE_BADGE: Record<string, string> = {
  random: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  sorted: 'bg-green-500/15 text-green-400 border-green-500/25',
  reversed: 'bg-rose-500/15 text-rose-400 border-rose-500/25',
  'nearly-sorted': 'bg-amber-500/15 text-amber-400 border-amber-500/25',
}

/* ─── skeleton ────────────────────────────────────────────── */
function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-foreground/8 ${className}`}
    />
  )
}

/* ─── stat card ───────────────────────────────────────────── */
interface StatCardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  gradient: string
  loading?: boolean
}

function StatCard({ label, value, icon, gradient, loading }: StatCardProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-border/30 bg-background/40 p-5 shadow-lg backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:border-border/50`}
    >
      {/* gradient accent */}
      <div className={`absolute inset-0 opacity-10 ${gradient}`} />
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {label}
          </p>
          {loading ? (
            <Skeleton className="mt-3 h-8 w-24" />
          ) : (
            <p className="mt-2 truncate text-3xl font-bold tracking-tight text-foreground">
              {value}
            </p>
          )}
        </div>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${gradient} text-white shadow-md`}
        >
          {icon}
        </div>
      </div>
    </div>
  )
}

/* ─── quick action card ───────────────────────────────────── */
interface QuickActionProps {
  href: string
  icon: React.ReactNode
  label: string
  description: string
  gradient: string
}

function QuickAction({ href, icon, label, description, gradient }: QuickActionProps) {
  return (
    <Link href={href}>
      <div className="group relative overflow-hidden rounded-2xl border border-border/30 bg-background/40 p-4 shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg cursor-pointer h-full">
        <div className={`absolute inset-0 opacity-0 group-hover:opacity-8 transition-opacity duration-300 ${gradient}`} />
        <div className="relative z-10">
          <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl ${gradient} text-white shadow-md`}>
            {icon}
          </div>
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
        <ArrowRight className="absolute bottom-4 right-4 h-3.5 w-3.5 text-muted-foreground/40 transition-all duration-200 group-hover:text-primary group-hover:translate-x-0.5" />
      </div>
    </Link>
  )
}

/* ─── custom tooltip ──────────────────────────────────────── */
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border/40 bg-card/90 px-4 py-2.5 shadow-xl backdrop-blur-xl text-sm">
      <p className="font-semibold text-foreground">{label}</p>
      <p className="text-primary mt-0.5">{payload[0].value} experiments</p>
    </div>
  )
}

/* ─── page ────────────────────────────────────────────────── */
export default function DashboardPage() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [recentExperiments, setRecentExperiments] = useState<ExperimentRecord[]>([])
  const [usageData, setUsageData] = useState<Array<{ algorithm: string; count: number }>>([])
  const [summary, setSummary] = useState({
    totalExperiments: 0,
    mostUsedAlgorithm: 'N/A',
    avgExecutionTime: 0,
    savedReports: 0,
  })

  useEffect(() => {
    let active = true
    void Promise.all([
      getCurrentUser(),
      listExperiments({ sortBy: 'newest', limit: 100 }),
      listReports({ limit: 1 }),
    ])
      .then(([currentUser, experimentResponse, reportResponse]) => {
        if (!active) return
        setUser(currentUser)
        const experiments = experimentResponse.items
        setRecentExperiments(experiments.slice(0, 6))

        const algorithmCountMap = experiments.reduce<Record<string, number>>((acc, item) => {
          acc[item.algorithm] = (acc[item.algorithm] ?? 0) + 1
          return acc
        }, {})

        const normalizedUsage = Object.entries(algorithmCountMap)
          .map(([algorithm, count]) => ({ algorithm, count }))
          .sort((a, b) => b.count - a.count)

        const avgExecutionTime =
          experiments.length > 0
            ? Math.round(experiments.reduce((t, i) => t + i.executionTime, 0) / experiments.length)
            : 0

        setUsageData(normalizedUsage)
        setSummary({
          totalExperiments: experimentResponse.total,
          mostUsedAlgorithm: normalizedUsage[0]?.algorithm ?? 'N/A',
          avgExecutionTime,
          savedReports: reportResponse.total,
        })
        setIsLoading(false)
      })
      .catch(() => {
        if (active) setIsLoading(false)
      })

    return () => { active = false }
  }, [])

  const stats: StatCardProps[] = [
    {
      label: 'Total Experiments',
      value: summary.totalExperiments,
      icon: <FlaskConical className="h-5 w-5" />,
      gradient: 'bg-gradient-to-br from-violet-500 to-indigo-600',
      loading: isLoading,
    },
    {
      label: 'Top Algorithm',
      value: summary.mostUsedAlgorithm,
      icon: <TrendingUp className="h-5 w-5" />,
      gradient: 'bg-gradient-to-br from-cyan-500 to-blue-600',
      loading: isLoading,
    },
    {
      label: 'Avg Execution Time',
      value: isLoading ? '—' : formatMs(summary.avgExecutionTime),
      icon: <Clock className="h-5 w-5" />,
      gradient: 'bg-gradient-to-br from-amber-500 to-orange-600',
      loading: isLoading,
    },
    {
      label: 'Saved Reports',
      value: summary.savedReports,
      icon: <FileText className="h-5 w-5" />,
      gradient: 'bg-gradient-to-br from-emerald-500 to-teal-600',
      loading: isLoading,
    },
  ]

  const quickActions: QuickActionProps[] = [
    {
      href: '/visualizer',
      icon: <Gauge className="h-4 w-4" />,
      label: 'Sort Algorithms Visualiser',
      description: 'Visualize sorting step by step',
      gradient: 'bg-gradient-to-br from-violet-500 to-indigo-600',
    },
    {
      href: '/analysis',
      icon: <BarChart2 className="h-4 w-4" />,
      label: 'Analysis',
      description: 'Compare algorithm performance',
      gradient: 'bg-gradient-to-br from-cyan-500 to-blue-600',
    },
    {
      href: '/binary-search',
      icon: <Search className="h-4 w-4" />,
      label: 'Search Algorithms Visualiser',
      description: 'Explore search traversal behaviors',
      gradient: 'bg-gradient-to-br from-pink-500 to-rose-600',
    },
    {
      href: '/reports',
      icon: <FileText className="h-4 w-4" />,
      label: 'Reports',
      description: 'View & download reports',
      gradient: 'bg-gradient-to-br from-emerald-500 to-teal-600',
    },
  ]

  return (
    <WorkspaceShell
      title="Dashboard"
      description={`${getGreeting()}, ${user?.name ?? 'Learner'} — here's your AlgoLab overview`}
    >
      <div className="space-y-7">

        {/* ── Welcome hero ── */}
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10 p-6 shadow-lg backdrop-blur-xl">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-10 right-20 h-32 w-32 rounded-full bg-accent/10 blur-2xl" />
          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                  AlgoLab Workspace
                </span>
              </div>
              <h2 className="text-xl font-bold text-foreground sm:text-2xl">
                {getGreeting()},{' '}
                <span className="text-primary">{user?.name?.split(' ')[0] ?? 'Learner'}</span>!
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {isLoading
                  ? 'Fetching your stats…'
                  : summary.totalExperiments === 0
                    ? 'Run your first experiment to get started.'
                    : `You have run ${summary.totalExperiments} experiment${summary.totalExperiments !== 1 ? 's' : ''} so far. Keep going!`}
              </p>
            </div>
          </div>
        </div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>

        {/* ── Quick Actions ── */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Quick Actions
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {quickActions.map((a) => (
              <QuickAction key={a.href} {...a} />
            ))}
          </div>
        </div>

        {/* ── Recent Experiments table ── */}
        <Card className="glass-card p-0 overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/30 px-5 py-4">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-primary" />
              <h2 className="text-base font-semibold text-foreground">Recent Experiments</h2>
            </div>
            <Link href="/experiments">
              <Button variant="ghost" size="sm" className="text-xs gap-1 text-muted-foreground hover:text-foreground">
                View all <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-3 px-5 py-5">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : recentExperiments.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/30">
                <FlaskConical className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">No experiments yet</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Run an algorithm to see results here.
                </p>
              </div>
              <Link href="/experiments">
                <Button size="sm" className="mt-1 gap-2 text-xs">
                  <Zap className="h-3 w-3" /> Run first experiment
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border/20 text-left">
                    <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Algorithm</th>
                    <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Mode</th>
                    <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Size</th>
                    <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Time</th>
                    <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Operations</th>
                    <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentExperiments.map((item, idx) => {
                    const modeCls = MODE_BADGE[item.mode] ?? 'bg-foreground/8 text-foreground/70 border-border/20'
                    return (
                      <tr
                        key={item.id}
                        className={`border-b border-border/10 text-foreground/90 transition-colors hover:bg-primary/4 ${idx % 2 === 0 ? '' : 'bg-background/20'}`}
                      >
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/8 px-2 py-0.5 text-xs font-semibold text-primary">
                            {item.algorithm}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${modeCls}`}>
                            {item.mode}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-mono text-xs text-foreground/80">{item.arraySize.toLocaleString()}</td>
                        <td className="px-5 py-3">
                          <span className="font-mono text-xs font-medium text-amber-400">
                            {formatMs(item.executionTime)}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-mono text-xs text-foreground/80">{item.operations.toLocaleString()}</td>
                        <td className="px-5 py-3 text-xs text-muted-foreground">
                          {new Date(item.createdAt).toLocaleDateString(undefined, {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* ── Algorithm Usage chart ── */}
        <Card className="glass-card p-5">
          <div className="mb-5 flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Algorithm Usage</h2>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-56 w-full" />
            </div>
          ) : usageData.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <BarChart2 className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No usage data yet.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={usageData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
                <XAxis
                  dataKey="algorithm"
                  stroke="transparent"
                  tick={{ fill: 'currentColor', fontSize: 11, opacity: 0.6 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="transparent"
                  tick={{ fill: 'currentColor', fontSize: 11, opacity: 0.6 }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  width={28}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(139,92,246,0.07)', radius: 8 }} />
                <Bar dataKey="count" name="Experiments" radius={[8, 8, 0, 0]} maxBarSize={60}>
                  {usageData.map((_, i) => (
                    <Cell key={i} fill={ALGO_COLORS[i % ALGO_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

      </div>
    </WorkspaceShell>
  )
}
