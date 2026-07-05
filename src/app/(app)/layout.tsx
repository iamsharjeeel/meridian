import * as React from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import { AppShell } from "./app-shell"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Fetch profile and organization name
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*, organizations ( name )")
    .eq("id", user.id)
    .maybeSingle()

  if (error || !profile) {
    redirect("/signup")
  }

  const orgName = (profile.organizations as any)?.name || "MERIDIAN"

  return (
    <AppShell
      user={{
        email: profile.email,
        fullName: profile.full_name,
        role: profile.role,
      }}
      orgName={orgName}
    >
      {children}
    </AppShell>
  )
}
