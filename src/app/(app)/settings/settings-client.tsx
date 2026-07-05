"use client"

import * as React from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/utils/supabase/client"
import { useTheme } from "next-themes"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { User, ShieldAlert, Monitor, Sun, Moon } from "lucide-react"

interface Profile {
  id: string
  full_name: string
  email: string
  role: string
  org_id: string
}

interface SettingsClientProps {
  profile: Profile
  initialOrgName: string
}

export function SettingsClient({ profile, initialOrgName }: SettingsClientProps) {
  const supabase = createClient()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { theme, setTheme } = useTheme()

  const isDocAdmin = profile.role === "owner" || profile.role === "admin"

  // Form States
  const [fullName, setFullName] = React.useState(profile.full_name)
  const [orgName, setOrgName] = React.useState(initialOrgName)

  const [profileSuccess, setProfileSuccess] = React.useState(false)
  const [profileError, setProfileError] = React.useState<string | null>(null)

  const [orgSuccess, setOrgSuccess] = React.useState(false)
  const [orgError, setOrgError] = React.useState<string | null>(null)

  // 1. Profile Update Mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from("profiles")
        .update({ full_name: name.trim() })
        .eq("id", profile.id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      setProfileSuccess(true)
      setProfileError(null)
      queryClient.invalidateQueries({ queryKey: ["profiles"] })
      router.refresh()
      setTimeout(() => setProfileSuccess(false), 3000)
    },
    onError: (err: any) => {
      setProfileError(err.message || "Failed to update profile.")
      setProfileSuccess(false)
    },
  })

  // 2. Org Update Mutation
  const updateOrgMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from("organizations")
        .update({ name: name.trim() })
        .eq("id", profile.org_id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      setOrgSuccess(true)
      setOrgError(null)
      router.refresh()
      setTimeout(() => setOrgSuccess(false), 3000)
    },
    onError: (err: any) => {
      setOrgError(err.message || "Failed to update organization name.")
      setOrgSuccess(false)
    },
  })

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    setProfileSuccess(false)
    setProfileError(null)
    if (!fullName) return
    updateProfileMutation.mutate(fullName)
  }

  const handleSaveOrg = (e: React.FormEvent) => {
    e.preventDefault()
    setOrgSuccess(false)
    setOrgError(null)
    if (!orgName) return
    updateOrgMutation.mutate(orgName)
  }

  return (
    <div className="space-y-8 max-w-xl">
      {/* Page Header */}
      <div className="border-b border-border pb-4">
        <h1 className="text-xl font-bold tracking-[-0.02em] text-foreground font-sans">
          Settings
        </h1>
        <p className="text-xs text-muted-foreground font-sans">
          Manage your personal settings and organization configuration.
        </p>
      </div>

      {/* Profile Settings Section */}
      <div className="rounded-[4px] border border-border bg-surface-1 p-5 space-y-4 shadow-sm font-sans">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-sans">
          <User className="h-3.5 w-3.5 text-muted-foreground" />
          Profile Settings
        </h2>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Email Address
            </label>
            <Input
              type="email"
              value={profile.email}
              disabled
              readOnly
              className="rounded-[4px] border-border bg-muted/30 text-sm font-sans opacity-70 cursor-not-allowed"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Your Full Name
            </label>
            <Input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Alex Rivera"
              required
              className="rounded-[4px] border-border bg-surface-2 text-sm font-sans focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0 focus-visible:border-primary"
            />
          </div>

          {profileError && (
            <div className="rounded-[4px] border border-destructive/20 bg-destructive/10 p-2 text-xs text-destructive">
              {profileError}
            </div>
          )}

          {profileSuccess && (
            <div className="rounded-[4px] border border-success/20 bg-success/10 p-2 text-xs text-success">
              Profile updated successfully.
            </div>
          )}

          <div className="flex justify-end pt-1">
            <Button
              type="submit"
              disabled={updateProfileMutation.isPending}
              className="rounded-[4px] bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-medium tracking-wide uppercase h-8 px-4 transition-all active:scale-[0.97]"
            >
              {updateProfileMutation.isPending ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        </form>
      </div>

      {/* Organization Settings Section */}
      <div className="rounded-[4px] border border-border bg-surface-1 p-5 space-y-4 shadow-sm font-sans">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-sans">
          <ShieldAlert className="h-3.5 w-3.5 text-muted-foreground" />
          Organization Settings
        </h2>

        <form onSubmit={handleSaveOrg} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Organization Name
            </label>
            <Input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Acme Corp"
              required
              disabled={!isDocAdmin}
              className="rounded-[4px] border-border bg-surface-2 text-sm font-sans focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0 focus-visible:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {!isDocAdmin && (
            <p className="text-[10px] text-muted-foreground/80 italic font-sans">
              Only workspace owners or administrators can change the organization name.
            </p>
          )}

          {orgError && (
            <div className="rounded-[4px] border border-destructive/20 bg-destructive/10 p-2 text-xs text-destructive">
              {orgError}
            </div>
          )}

          {orgSuccess && (
            <div className="rounded-[4px] border border-success/20 bg-success/10 p-2 text-xs text-success">
              Organization name updated.
            </div>
          )}

          {isDocAdmin && (
            <div className="flex justify-end pt-1">
              <Button
                type="submit"
                disabled={updateOrgMutation.isPending}
                className="rounded-[4px] bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-medium tracking-wide uppercase h-8 px-4 transition-all active:scale-[0.97]"
              >
                {updateOrgMutation.isPending ? "Saving..." : "Save Workspace Name"}
              </Button>
            </div>
          )}
        </form>
      </div>

      {/* Theme Settings Section */}
      <div className="rounded-[4px] border border-border bg-surface-1 p-5 space-y-4 shadow-sm font-sans">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-sans">
          <Monitor className="h-3.5 w-3.5 text-muted-foreground" />
          Appearance Settings
        </h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-foreground">Theme Preference</p>
              <p className="text-[10px] text-muted-foreground">Select how MERIDIAN looks on your screen.</p>
            </div>
            <div className="w-36">
              <Select value={theme} onValueChange={(val) => setTheme(val || "system")}>
                <SelectTrigger className="rounded-[4px] border-border bg-surface-2 text-xs h-8 focus:ring-1 focus:ring-primary focus:ring-offset-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-[4px] border-border bg-surface-2 text-xs">
                  <SelectItem value="light">
                    <span className="flex items-center gap-1.5">
                      <Sun className="h-3 w-3" /> Light Mode
                    </span>
                  </SelectItem>
                  <SelectItem value="dark">
                    <span className="flex items-center gap-1.5">
                      <Moon className="h-3 w-3" /> Dark Mode
                    </span>
                  </SelectItem>
                  <SelectItem value="system">
                    <span className="flex items-center gap-1.5">
                      <Monitor className="h-3 w-3" /> System Default
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
