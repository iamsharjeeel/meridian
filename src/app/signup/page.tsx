"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { motion } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [fullName, setFullName] = React.useState("")
  const [orgName, setOrgName] = React.useState("")
  
  const [isAuthenticated, setIsAuthenticated] = React.useState(false)
  const [checkingAuth, setCheckingAuth] = React.useState(true)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setIsAuthenticated(true)
        setEmail(user.email || "")
      }
      setCheckingAuth(false)
    }
    checkUser()
  }, [supabase])

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!isAuthenticated) {
        // Step 1: Sign up new user
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        })

        if (signUpError) {
          setError(signUpError.message)
          setLoading(false)
          return
        }

        if (!signUpData.user) {
          setError("Failed to create user account.")
          setLoading(false)
          return
        }
      }

      // Step 2: Call create_organization RPC
      // Note: RLS / DB function uses auth.uid() from current active session
      const { error: rpcError } = await supabase.rpc("create_organization", {
        p_org_name: orgName,
        p_full_name: fullName,
      })

      if (rpcError) {
        setError(rpcError.message)
        setLoading(false)
        return
      }

      // Step 3: Critical refresh session to load custom JWT claims
      const { error: refreshError } = await supabase.auth.refreshSession()
      if (refreshError) {
        console.error("Failed to refresh session claims:", refreshError.message)
      }

      router.push("/dashboard")
      router.refresh()
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.")
      setLoading(false)
    }
  }

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="h-4 w-24 animate-pulse rounded bg-border" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", duration: 0.4, bounce: 0 }}
        className="w-full max-w-[360px] space-y-6"
      >
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-[-0.02em] font-sans text-foreground">
            MERIDIAN
          </h1>
          <p className="text-xs text-muted-foreground font-sans">
            {isAuthenticated
              ? "Complete your organization profile"
              : "Create a new organization account"}
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Email Address
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              required
              disabled={isAuthenticated}
              className="rounded-[4px] border-border bg-surface-1 text-sm font-sans focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0 focus-visible:border-primary disabled:opacity-50"
            />
          </div>

          {!isAuthenticated && (
            <div className="space-y-1">
              <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Password
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="rounded-[4px] border-border bg-surface-1 text-sm font-sans focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0 focus-visible:border-primary"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Your Full Name
            </label>
            <Input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Alex Rivera"
              required
              className="rounded-[4px] border-border bg-surface-1 text-sm font-sans focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0 focus-visible:border-primary"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Organization Name
            </label>
            <Input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Acme Corp"
              required
              className="rounded-[4px] border-border bg-surface-1 text-sm font-sans focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0 focus-visible:border-primary"
            />
          </div>

          {error && (
            <div className="rounded-[4px] border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive font-sans">
              {error}
            </div>
          )}

          <motion.div whileTap={{ scale: 0.97 }}>
            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-[4px] bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-medium tracking-wide uppercase py-2 h-9 transition-colors"
            >
              {loading ? "Registering..." : "Create Account"}
            </Button>
          </motion.div>
        </form>

        <div className="text-center font-sans">
          <p className="text-xs text-muted-foreground">
            {isAuthenticated ? (
              <button
                onClick={async () => {
                  await supabase.auth.signOut()
                  setIsAuthenticated(false)
                  setEmail("")
                  router.refresh()
                }}
                className="text-primary hover:underline font-medium"
              >
                Sign out of this email
              </button>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  onClick={() => router.push("/login")}
                  className="text-primary hover:underline font-medium"
                >
                  Sign In
                </button>
              </>
            )}
          </p>
        </div>
      </motion.div>
    </div>
  )
}
