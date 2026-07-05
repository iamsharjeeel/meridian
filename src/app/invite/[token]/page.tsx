import * as React from "react"
import { createAdminClient } from "@/utils/supabase/admin"
import { InviteForm } from "@/components/invite-form"

interface PageProps {
  params: Promise<{
    token: string
  }>
}

async function getInviteDetails(token: string) {
  const admin = createAdminClient()

  // Fetch only the allowed details, joining organizations
  const { data: invite, error } = await admin
    .from("invites")
    .select("email, role, accepted_at, expires_at, organizations ( name )")
    .eq("token", token)
    .maybeSingle()

  if (error || !invite) {
    console.error("Invite not found or error fetching:", error)
    return null
  }

  // Ensure the invite hasn't been accepted yet
  if (invite.accepted_at) {
    return null
  }

  // Ensure the invite hasn't expired
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return null
  }

  const orgName = (invite.organizations as any)?.name || "Unknown Organization"

  return {
    orgName,
    email: invite.email,
    role: invite.role,
  }
}

export default async function InvitePage({ params }: PageProps) {
  const resolvedParams = await params
  const inviteData = await getInviteDetails(resolvedParams.token)

  if (!inviteData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-[360px] text-center space-y-4 font-sans">
          <h1 className="text-2xl font-bold tracking-[-0.02em] text-foreground">
            MERIDIAN
          </h1>
          <div className="rounded-[4px] border border-destructive/20 bg-destructive/10 p-4 text-xs text-destructive">
            This invitation link is invalid, expired, or has already been accepted.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-[360px] p-2">
        <InviteForm
          orgName={inviteData.orgName}
          email={inviteData.email}
          role={inviteData.role}
          token={resolvedParams.token}
        />
      </div>
    </div>
  )
}
