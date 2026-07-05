import * as React from "react"
import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { SettingsClient } from "./settings-client"

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Fetch caller's profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*, organizations ( name )")
    .eq("id", user.id)
    .maybeSingle()

  if (!profile) {
    redirect("/signup")
  }

  const orgName = (profile.organizations as any)?.name || ""

  return (
    <SettingsClient
      profile={profile}
      initialOrgName={orgName}
    />
  )
}
