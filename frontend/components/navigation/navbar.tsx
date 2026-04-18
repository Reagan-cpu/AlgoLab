'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Code2, Menu, Search } from 'lucide-react'
import { toast } from 'sonner'

import { getApiErrorMessage, getCurrentUser, logout, type AuthUser } from '@/lib/api'
import { ModeToggle } from '@/components/mode-toggle'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getNavigationByRole } from '@/components/navigation/nav-config'
import { MobileSidebar } from '@/components/navigation/mobile-sidebar'
import { UserDropdown } from '@/components/navigation/user-dropdown'

interface SearchTarget {
  label: string
  href: string
  keywords: string[]
  description?: string
}

interface AppNavbarProps {
  onSidebarToggle?: () => void
  onRightSidebarToggle?: () => void
  rightSidebarOpen?: boolean
}

export function AppNavbar({
  onSidebarToggle,
  onRightSidebarToggle,
  rightSidebarOpen,
}: AppNavbarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const [user, setUser] = useState<AuthUser | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchFocused, setIsSearchFocused] = useState(false)

  useEffect(() => {
    let mounted = true

    void getCurrentUser()
      .then((currentUser) => {
        if (mounted) {
          setUser(currentUser)
        }
      })
      .catch(() => {
        if (mounted) {
          setUser(null)
        }
      })

    return () => {
      mounted = false
    }
  }, [])

  const navItems = useMemo(() => getNavigationByRole(user?.role), [user?.role])

  const searchTargets = useMemo(() => {
    const fromNav: SearchTarget[] = navItems.map((item) => ({
      label: item.label,
      href: item.href,
      keywords: [item.label, item.href],
      description: 'Navigation section',
    }))

    const curatedTargets: SearchTarget[] = [
      {
        label: 'Binary Search Visualizer',
        href: '/binary-search',
        keywords: ['binary', 'search', 'array', 'target'],
        description: 'Find an element in a sorted list',
      },
      {
        label: 'Experiments Workspace',
        href: '/experiments',
        keywords: ['experiments', 'runs', 'benchmarks'],
        description: 'Run and compare algorithm experiments',
      },
    ]

    const dedupedTargets = new Map<string, SearchTarget>()

    ;[...fromNav, ...curatedTargets].forEach((target) => {
      const existing = dedupedTargets.get(target.href)

      if (!existing) {
        dedupedTargets.set(target.href, target)
        return
      }

      dedupedTargets.set(target.href, {
        ...existing,
        keywords: [...new Set([...existing.keywords, ...target.keywords])],
        description: existing.description ?? target.description,
      })
    })

    return Array.from(dedupedTargets.values())
  }, [navItems])

  const normalizedQuery = searchQuery.trim().toLowerCase()

  const searchResults = useMemo(() => {
    if (!normalizedQuery) {
      return []
    }

    const terms = normalizedQuery.split(/\s+/)

    return searchTargets
      .map((target) => {
        const searchableText = [
          target.label,
          target.href,
          target.description ?? '',
          target.keywords.join(' '),
        ]
          .join(' ')
          .toLowerCase()

        const matches = terms.every((term) => searchableText.includes(term))

        if (!matches) {
          return null
        }

        const label = target.label.toLowerCase()
        const rank =
          Number(!label.startsWith(normalizedQuery)) + Number(!label.includes(normalizedQuery))

        return { target, rank }
      })
      .filter((entry): entry is { target: SearchTarget; rank: number } => entry !== null)
      .sort((a, b) => a.rank - b.rank || a.target.label.localeCompare(b.target.label))
      .slice(0, 6)
      .map((entry) => entry.target)
  }, [normalizedQuery, searchTargets])

  useEffect(() => {
    setSearchQuery('')
    setIsSearchFocused(false)
  }, [pathname])

  const navigateFromSearch = (target: SearchTarget) => {
    setSearchQuery('')
    setIsSearchFocused(false)
    router.push(target.href)
  }

  const handleSearchSubmit = () => {
    const firstResult = searchResults[0]

    if (!firstResult) {
      toast('No matching section found')
      return
    }

    navigateFromSearch(firstResult)
  }

  const handleLogout = async () => {
    if (isLoggingOut) {
      return
    }

    try {
      setIsLoggingOut(true)
      await logout()
      toast.success('Logged out successfully')
      router.push('/login')
      router.refresh()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Logout failed'))
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <header className="sticky top-0 z-50 px-0">
      <motion.nav
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="mx-0 rounded-none border-b border-border/35 bg-background/55 shadow-[0_12px_30px_rgba(15,23,42,0.16)] backdrop-blur-2xl supports-[backdrop-filter]:bg-background/30"
        aria-label="Primary"
      >
        <div className="flex h-16 items-center justify-between gap-2 px-3 sm:px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onSidebarToggle}
              className="hidden lg:flex h-9 w-9 p-0"
              aria-label="Toggle sidebar"
            >
              <Menu className="size-4" />
            </Button>
            <Link
              href="/dashboard"
              className="group flex items-center gap-2 rounded-full px-2 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
            >
              <span className="flex size-8 items-center justify-center rounded-xl border border-primary/35 bg-primary/20 transition-colors group-hover:bg-primary/30">
                <Code2 className="size-4 text-primary" />
              </span>
              <div className="leading-tight">
                <p className="text-sm font-semibold tracking-tight text-foreground sm:text-base">
                  AlgoLab
                </p>
                <p className="hidden text-xs text-muted-foreground lg:block">
                  Algorithm Performance Analyzer
                </p>
              </div>
            </Link>
          </div>

          <div className="hidden min-w-0 flex-1 px-4 md:block lg:px-8">
            <div className="relative mx-auto max-w-2xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search algorithms, datasets, reports..."
                className="h-10 rounded-full border-border/45 bg-background/35 pl-9 pr-4"
                aria-label="Search AlgoLab"
                value={searchQuery}
                autoComplete="off"
                onChange={(event) => setSearchQuery(event.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => {
                  window.setTimeout(() => {
                    setIsSearchFocused(false)
                  }, 120)
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    handleSearchSubmit()
                  }

                  if (event.key === 'Escape') {
                    setSearchQuery('')
                    setIsSearchFocused(false)
                  }
                }}
              />

              {isSearchFocused && normalizedQuery && (
                <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-2xl border border-border/50 bg-background/95 shadow-xl backdrop-blur">
                  {searchResults.length > 0 ? (
                    <ul className="max-h-72 space-y-1 overflow-y-auto p-1.5">
                      {searchResults.map((result) => (
                        <li key={result.href}>
                          <button
                            type="button"
                            className="flex w-full items-start justify-between gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-accent/70"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => navigateFromSearch(result)}
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium text-foreground">
                                {result.label}
                              </span>
                              <span className="block truncate text-xs text-muted-foreground">
                                {result.description ?? result.href}
                              </span>
                            </span>
                            <span className="shrink-0 text-xs text-muted-foreground">Enter</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="px-4 py-3 text-sm text-muted-foreground">
                      No matching section found.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            {onRightSidebarToggle && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRightSidebarToggle}
                className="hidden h-9 px-3 text-xs font-semibold 2xl:flex"
                aria-label="Toggle right sidebar"
              >
                {rightSidebarOpen ? 'Hide Info' : 'Show Info'}
              </Button>
            )}

            <ModeToggle compact />

            <UserDropdown
              user={user}
              isLoggingOut={isLoggingOut}
              onLogout={() => handleLogout()}
            />
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <ModeToggle compact />

            <Button
              variant="ghost"
              size="icon"
              className="rounded-full border border-border/35 bg-background/25"
              aria-label="Open navigation menu"
              aria-expanded={mobileOpen}
              aria-controls="mobile-navigation"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="size-5" />
            </Button>
          </div>
        </div>
      </motion.nav>

      <MobileSidebar
        open={mobileOpen}
        onOpenChange={setMobileOpen}
        user={user}
        navItems={navItems}
        pathname={pathname}
        notificationCount={0}
        isLoggingOut={isLoggingOut}
        onLogout={() => handleLogout()}
      />
    </header>
  )
}
