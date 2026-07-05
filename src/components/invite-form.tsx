"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { motion } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface InviteFormProps {
  orgName: string
  email: string
  role: string
  token: string
}

export function InviteForm({ orgName, email, role, token }: InviteFormProps) {
  const router = useRouter()
  const supabase = createClient()

  const [isAuthenticated, setIsAuthenticated] = React.useState(false)
  const [checkingAuth, setCheckingAuth] = React.useState(true)
  const [isLoginMode, setIsLoginMode] = React.useState(false)
  const [fullName, setFullName] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setIsAuthenticated(true)
        // Fetch existing profile to prefill name if exists
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .maybeSingle()
        if (profile?.full_name) {
          setFullName(profile.full_name)
        }
      }
      setCheckingAuth(false)
    }
    checkUser()
  }, [supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!isAuthenticated) {
        if (isLoginMode) {
          // Log in first
          const { error: loginError } = await supabase.auth.signInWithPassword({
            email,
            password,
          })
          if (loginError) {
            setError(loginError.message)
            setLoading(false)
            return
          }
        } else {
          // Sign up first
          const { error: signUpError } = await supabase.auth.signUp({
            email,
            password,
          })
          if (signUpError) {
            setError(signUpError.message)
            setLoading(false)
            return
          }
        }
      }

      // Now authenticated: call accept_invite RPC
      const nameToSubmit = fullName.trim() || "New Member"
      const { error: rpcError } = await supabase.rpc("accept_invite", {
        p_token: token,
        p_full_name: nameToSubmit,
      })

      if (rpcError) {
        setError(rpcError.message)
        setLoading(false)
        return
      }

      // Critical session refresh to load the new JWT claims
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
      <div className="flex justify-center items-center py-8">
        <div className="h-4 w-24 animate-pulse rounded bg-border" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center font-sans">
        <h1 className="text-2xl font-bold tracking-[-0.02em] text-foreground">
          MERIDIAN
        </h1>
        <p className="text-xs text-muted-foreground max-w-[300px] mx-auto leading-relaxed">
          You've been invited to join <span className="font-semibold text-foreground">{orgName}</span> as a{" "}
          <span className="font-semibold text-foreground font-tabular">{role}</span>.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email is read-only */}
        <div className="space-y-1">
          <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Invited Email
          </label>
          <Input
            type="email"
            value={email}
            readOnly
            disabled
            className="rounded-[4px] border-border bg-muted/30 text-sm font-sans opacity-70"
          />
        </div>

        {/* Name input (only for signup mode or if currently authenticated) */}
        {(!isAuthenticated || !fullName) && (
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
        )}

        {/* Password input (only if not authenticated) */}
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
            {loading
              ? "Processing..."
              : isAuthenticated
              ? "Accept & Join"
              : isLoginMode
              ? "Log In & Join"
              : "Create Account & Join"}
          </Button>
        </motion.div>
      </form>

      {!isAuthenticated && (
        <div className="text-center font-sans">
          <p className="text-xs text-muted-foreground">
            {isLoginMode ? "Need to create an account?" : "Already have an account?"}{" "}
            <button
              onClick={() => setIsLoginMode(!isLoginMode)}
              className="text-primary hover:underline font-medium"
            >
              {isLoginMode ? "Sign Up" : "Log In"}
            </button>
          </p>
        </div>
      )}
    </div>
  )
}
