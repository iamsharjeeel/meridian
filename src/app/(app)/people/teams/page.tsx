import * as React from "react"
import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { TeamsClient } from "./teams-client"

export default async function TeamsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Fetch current user profile to verify role
  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle()

  if (!currentProfile) {
    redirect("/signup")
  }

  // Fetch teams with manager profiles
  const { data: teams } = await supabase
    .from("teams")
    .select("*, manager:profiles ( full_name, email )")
    .order("name")

  // Fetch organization members to choose managers from
  const { data: members } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .order("full_name")

  return (
    <TeamsClient
      initialTeams={teams || []}
      members={members || []}
      currentUserRole={currentProfile.role}
      orgId={currentProfile.org_id}
    />
  )
}
