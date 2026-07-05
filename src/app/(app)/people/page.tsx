import * as React from "react"
import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { PeopleClient } from "./people-client"

export default async function PeoplePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Fetch current user's profile
  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle()

  if (!currentProfile) {
    redirect("/signup")
  }

  // Fetch profiles with teams
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*, teams ( name )")
    .order("full_name")

  // Fetch teams
  const { data: teams } = await supabase
    .from("teams")
    .select("*")
    .order("name")

  // Fetch pending invites
  const { data: invites } = await supabase
    .from("invites")
    .select("*, teams ( name )")
    .is("accepted_at", null)
    .order("created_at", { ascending: false })

  return (
    <PeopleClient
      initialProfiles={profiles || []}
      initialTeams={teams || []}
      initialInvites={invites || []}
      currentUserRole={currentProfile.role}
      currentUserId={user.id}
    />
  )
}
