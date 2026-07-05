"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { createClient } from "@/utils/supabase/client"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Clock,
  Users,
  Calendar,
  CreditCard,
  Settings,
  Menu,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sun,
  Moon,
  User,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface AppShellProps {
  children: React.ReactNode
  user: {
    email: string
    fullName: string
    role: string
  }
  orgName: string
}

export function AppShell({ children, user, orgName }: AppShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  // Sidebar states
  const [isCollapsed, setIsCollapsed] = React.useState(false)
  const [isMobileOpen, setIsMobileOpen] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem("meridian_sidebar_collapsed")
    if (stored) {
      setIsCollapsed(stored === "true")
    }
  }, [])

  const toggleSidebar = () => {
    const nextState = !isCollapsed
    setIsCollapsed(nextState)
    localStorage.setItem("meridian_sidebar_collapsed", String(nextState))
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, enabled: true },
    { name: "Timesheets", href: "/timesheets", icon: Clock, enabled: false },
    { name: "People", href: "/people", icon: Users, enabled: true },
    { name: "Leave", href: "/leave", icon: Calendar, enabled: false },
    { name: "Payroll", href: "/payroll", icon: CreditCard, enabled: false },
    { name: "Settings", href: "/settings", icon: Settings, enabled: true },
  ]

  if (!mounted) {
    return (
      <div className="flex h-screen bg-background items-center justify-center">
        <div className="h-4 w-24 animate-pulse rounded bg-border" />
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r border-border bg-surface-1 transition-all duration-300 relative z-20",
          isCollapsed ? "w-16" : "w-60"
        )}
      >
        {/* Sidebar Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-border">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="font-sans font-bold text-lg tracking-[-0.02em] text-foreground select-none">
              {isCollapsed ? "M" : "MERIDIAN"}
            </span>
          </Link>
          {!isCollapsed && (
            <button
              onClick={toggleSidebar}
              className="p-1 rounded-[4px] hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          {isCollapsed && (
            <button
              onClick={toggleSidebar}
              className="absolute right-[-10px] top-4 p-0.5 rounded-full border border-border bg-surface-1 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            const Icon = item.icon
            
            if (!item.enabled) {
              return (
                <div
                  key={item.name}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-[4px] text-xs font-medium text-muted-foreground/45 cursor-not-allowed select-none",
                    isCollapsed && "justify-center"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!isCollapsed && <span className="font-sans">{item.name}</span>}
                </div>
              )
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-[4px] text-xs font-medium transition-colors font-sans relative group",
                  isActive
                    ? "bg-secondary text-foreground border-l-[2px] border-primary pl-[10px]"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
                {!isCollapsed && <span>{item.name}</span>}
                {isCollapsed && (
                  <span className="absolute left-16 scale-0 rounded-[4px] border border-border bg-surface-1 px-2 py-1 text-xs text-foreground group-hover:scale-100 transition-all z-30 font-sans shadow-sm">
                    {item.name}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Mobile Drawer Backdrop */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
            className="md:hidden fixed inset-0 bg-black z-30"
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", duration: 0.3, bounce: 0 }}
            className="md:hidden fixed inset-y-0 left-0 w-60 border-r border-border bg-surface-1 z-40 flex flex-col"
          >
            <div className="h-14 flex items-center justify-between px-4 border-b border-border">
              <span className="font-sans font-bold text-lg tracking-[-0.02em] text-foreground">
                MERIDIAN
              </span>
              <button
                onClick={() => setIsMobileOpen(false)}
                className="p-1 rounded-[4px] hover:bg-secondary text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 p-3">
              {navigation.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
                const Icon = item.icon
                
                if (!item.enabled) {
                  return (
                    <div
                      key={item.name}
                      className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-muted-foreground/45 cursor-not-allowed select-none"
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="font-sans">{item.name}</span>
                    </div>
                  )
                }

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-[4px] text-xs font-medium transition-colors font-sans",
                      isActive
                        ? "bg-secondary text-foreground border-l-[2px] border-primary pl-[10px]"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </nav>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-14 border-b border-border bg-surface-1 flex items-center justify-between px-4 z-10 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="md:hidden p-1.5 rounded-[4px] hover:bg-secondary text-muted-foreground hover:text-foreground"
            >
              <Menu className="h-4 w-4" />
            </button>
            <span className="font-sans text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {orgName}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Animated Theme Toggle */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-1.5 rounded-[4px] hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors relative overflow-hidden"
              aria-label="Toggle theme"
            >
              <motion.div
                initial={false}
                animate={{ rotate: theme === "dark" ? 0 : 90, scale: theme === "dark" ? 1 : 0 }}
                transition={{ type: "spring", duration: 0.3 }}
                className={cn("h-4 w-4", theme === "dark" ? "block" : "hidden")}
              >
                <Moon className="h-4 w-4" />
              </motion.div>
              <motion.div
                initial={false}
                animate={{ rotate: theme === "light" ? 0 : -90, scale: theme === "light" ? 1 : 0 }}
                transition={{ type: "spring", duration: 0.3 }}
                className={cn("h-4 w-4", theme === "light" ? "block" : "hidden")}
              >
                <Sun className="h-4 w-4" />
              </motion.div>
            </button>

            {/* User Dropdown Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 p-1 rounded-[4px] hover:bg-secondary transition-colors text-left focus:outline-none cursor-pointer">
                <div className="h-6 w-6 rounded-full border border-border bg-secondary flex items-center justify-center shrink-0">
                  <User className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="hidden sm:block">
                  <p className="text-xs font-semibold font-sans text-foreground leading-none">
                    {user.fullName}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-tabular leading-none mt-0.5 select-none uppercase">
                    {user.role}
                  </p>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 rounded-[4px] border-border bg-surface-1 font-sans text-xs"
              >
                <DropdownMenuLabel className="font-semibold text-foreground text-xs">
                  My Account
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem className="focus:bg-secondary focus:text-foreground">
                  <Link href="/settings" className="w-full h-full flex items-center">
                    Profile Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="focus:bg-destructive/10 focus:text-destructive text-destructive"
                >
                  <LogOut className="mr-2 h-3.5 w-3.5" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Content Wrapper */}
        <main className="flex-1 overflow-y-auto bg-background p-6">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", duration: 0.35, bounce: 0 }}
            className="max-w-6xl mx-auto h-full"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  )
}
