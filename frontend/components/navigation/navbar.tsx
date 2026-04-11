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

export function AppNavbar() {
  const pathname = usePathname()
  const router = useRouter()

  const [user, setUser] = useState<AuthUser | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

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
    <header className="sticky top-0 z-50 px-2 pt-3 sm:px-3">
      <motion.nav
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="mx-auto max-w-7xl rounded-2xl border border-border/40 bg-background/45 shadow-[0_10px_30px_rgba(0,0,0,0.2)] backdrop-blur-2xl"
        aria-label="Primary"
      >
        <div className="flex h-16 items-center justify-between gap-2 px-3 sm:px-4 lg:px-6">
          <div className="flex items-center">
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
              />
            </div>
          </div>

          <div className="hidden items-center gap-2 md:flex">
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
