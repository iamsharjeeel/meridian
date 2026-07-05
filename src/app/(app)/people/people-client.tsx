"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/utils/supabase/client"
import { motion, AnimatePresence } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { UserPlus, Trash2, Mail, Users, UserCheck } from "lucide-react"

interface Profile {
  id: string
  full_name: string
  email: string
  role: string
  team_id: string | null
  teams: { name: string } | null
}

interface Invite {
  id: string
  email: string
  role: string
  team_id: string | null
  token: string
  created_at: string
  teams: { name: string } | null
}

interface Team {
  id: string
  name: string
}

interface PeopleClientProps {
  initialProfiles: Profile[]
  initialTeams: Team[]
  initialInvites: Invite[]
  currentUserRole: string
  currentUserId: string
}

export function PeopleClient({
  initialProfiles,
  initialTeams,
  initialInvites,
  currentUserRole,
  currentUserId,
}: PeopleClientProps) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const isDocAdmin = currentUserRole === "owner" || currentUserRole === "admin"

  // Modals state
  const [isInviteOpen, setIsInviteOpen] = React.useState(false)
  const [inviteEmail, setInviteEmail] = React.useState("")
  const [inviteRole, setInviteRole] = React.useState("employee")
  const [inviteTeamId, setInviteTeamId] = React.useState<string>("none")
  const [inviteError, setInviteError] = React.useState<string | null>(null)

  // 1. Fetch profiles
  const { data: profiles = [] } = useQuery<Profile[]>({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*, teams ( name )")
        .order("full_name")
      return (data as any) || []
    },
    initialData: initialProfiles,
  })

  // 2. Fetch pending invites
  const { data: invites = [] } = useQuery<Invite[]>({
    queryKey: ["invites"],
    queryFn: async () => {
      const { data } = await supabase
        .from("invites")
        .select("*, teams ( name )")
        .is("accepted_at", null)
        .order("created_at", { ascending: false })
      return (data as any) || []
    },
    initialData: initialInvites,
    enabled: isDocAdmin, // Only run query for admins
  })

  // 3. Create Invite Mutation
  const createInviteMutation = useMutation({
    mutationFn: async (newInvite: {
      email: string
      role: string
      team_id: string | null
    }) => {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newInvite),
      })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData?.error || "Failed to create invitation.")
      }
      return res.json()
    },
    onMutate: async (newInvite) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["invites"] })
      // Snapshot current invites
      const previousInvites = queryClient.getQueryData<Invite[]>(["invites"])
      // Optimistically add to invites list
      if (previousInvites) {
        const tempInvite: Invite = {
          id: Math.random().toString(),
          email: newInvite.email,
          role: newInvite.role,
          team_id: newInvite.team_id,
          token: "",
          created_at: new Date().toISOString(),
          teams: newInvite.team_id
            ? { name: initialTeams.find((t) => t.id === newInvite.team_id)?.name || "" }
            : null,
        }
        queryClient.setQueryData<Invite[]>(["invites"], [tempInvite, ...previousInvites])
      }
      return { previousInvites }
    },
    onError: (err, newInvite, context) => {
      if (context?.previousInvites) {
        queryClient.setQueryData(["invites"], context.previousInvites)
      }
      setInviteError(err.message)
    },
    onSuccess: () => {
      setInviteEmail("")
      setInviteRole("employee")
      setInviteTeamId("none")
      setIsInviteOpen(false)
      setInviteError(null)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["invites"] })
    },
  })

  // 4. Revoke Invite Mutation
  const revokeInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      const res = await fetch(`/api/invites?id=${inviteId}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData?.error || "Failed to revoke invitation.")
      }
      return res.json()
    },
    onMutate: async (inviteId) => {
      await queryClient.cancelQueries({ queryKey: ["invites"] })
      const previousInvites = queryClient.getQueryData<Invite[]>(["invites"])
      if (previousInvites) {
        queryClient.setQueryData<Invite[]>(
          ["invites"],
          previousInvites.filter((invite) => invite.id !== inviteId)
        )
      }
      return { previousInvites }
    },
    onError: (err, inviteId, context) => {
      if (context?.previousInvites) {
        queryClient.setQueryData(["invites"], context.previousInvites)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["invites"] })
    },
  })

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault()
    setInviteError(null)
    if (!inviteEmail) return

    createInviteMutation.mutate({
      email: inviteEmail,
      role: inviteRole,
      team_id: inviteTeamId === "none" ? null : inviteTeamId,
    })
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-[-0.02em] text-foreground font-sans">
            People
          </h1>
          <p className="text-xs text-muted-foreground font-sans">
            Manage your organization's directory and invitations.
          </p>
        </div>

        {/* Invite Member Button (Admin-only) */}
        {isDocAdmin && (
          <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
            <DialogTrigger render={
              <Button className="rounded-[4px] bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-medium tracking-wide uppercase h-9 px-4 transition-all active:scale-[0.97]">
                <UserPlus className="mr-2 h-4 w-4" />
                Invite Member
              </Button>
            } />
            <DialogContent className="max-w-[400px] rounded-[4px] border-border bg-surface-1 font-sans">
              <DialogHeader>
                <DialogTitle className="text-sm font-bold tracking-tight">
                  Invite Member
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Send an email invitation link to join this organization.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSendInvite} className="space-y-4 py-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="name@company.com"
                    required
                    className="rounded-[4px] border-border bg-surface-2 text-sm focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0 focus-visible:border-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Role
                  </label>
                  <Select value={inviteRole} onValueChange={(val) => setInviteRole(val || "employee")}>
                    <SelectTrigger className="rounded-[4px] border-border bg-surface-2 text-sm h-9 focus:ring-1 focus:ring-primary focus:ring-offset-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-[4px] border-border bg-surface-2 text-xs">
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="admin">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Assign Team (Optional)
                  </label>
                  <Select value={inviteTeamId} onValueChange={(val) => setInviteTeamId(val || "none")}>
                    <SelectTrigger className="rounded-[4px] border-border bg-surface-2 text-sm h-9 focus:ring-1 focus:ring-primary focus:ring-offset-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-[4px] border-border bg-surface-2 text-xs">
                      <SelectItem value="none">No Team</SelectItem>
                      {initialTeams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {inviteError && (
                  <div className="rounded-[4px] border border-destructive/20 bg-destructive/10 p-2 text-xs text-destructive">
                    {inviteError}
                  </div>
                )}

                <DialogFooter className="pt-2">
                  <Button
                    type="submit"
                    disabled={createInviteMutation.isPending}
                    className="w-full rounded-[4px] bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-medium tracking-wide uppercase h-9"
                  >
                    {createInviteMutation.isPending ? "Sending..." : "Send Invitation"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Directory Table */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-sans">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          Directory ({profiles.length})
        </h2>
        <div className="rounded-[4px] border border-border bg-surface-1 overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground h-9 font-sans">
                  Name
                </TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground h-9 font-sans">
                  Email
                </TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground h-9 font-sans">
                  Role
                </TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground h-9 font-sans">
                  Team
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-xs text-muted-foreground font-sans italic">
                    No active members found.
                  </TableCell>
                </TableRow>
              ) : (
                profiles.map((profile) => (
                  <TableRow key={profile.id} className="border-border hover:bg-secondary/40">
                    <TableCell className="py-2.5 text-xs font-semibold text-foreground font-sans">
                      {profile.full_name}
                      {profile.id === currentUserId && (
                        <span className="ml-1.5 text-[9px] font-medium bg-primary/10 text-primary border border-primary/20 px-1 py-0.5 rounded-[2px] uppercase tracking-wider font-sans select-none">
                          You
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-2.5 text-xs text-muted-foreground font-sans">
                      {profile.email}
                    </TableCell>
                    <TableCell className="py-2.5 text-xs font-tabular text-foreground font-mono select-none uppercase">
                      {profile.role}
                    </TableCell>
                    <TableCell className="py-2.5 text-xs text-foreground font-sans">
                      {profile.teams?.name || (
                        <span className="text-muted-foreground/60 italic font-sans">
                          No team
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pending Invites Section (Admin-only) */}
      {isDocAdmin && (
        <div className="space-y-3 pt-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-sans">
            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
            Pending Invitations ({invites?.length || 0})
          </h2>
          <div className="rounded-[4px] border border-border bg-surface-1 overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground h-9 font-sans">
                    Email Address
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground h-9 font-sans">
                    Role
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground h-9 font-sans">
                    Assigned Team
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground h-9 font-sans text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!invites || invites.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-16 text-center text-xs text-muted-foreground font-sans italic">
                      No pending invitations.
                    </TableCell>
                  </TableRow>
                ) : (
                  invites.map((invite) => (
                    <TableRow key={invite.id} className="border-border hover:bg-secondary/40">
                      <TableCell className="py-2.5 text-xs font-semibold text-foreground font-sans">
                        {invite.email}
                      </TableCell>
                      <TableCell className="py-2.5 text-xs font-tabular text-foreground font-mono select-none uppercase">
                        {invite.role}
                      </TableCell>
                      <TableCell className="py-2.5 text-xs text-foreground font-sans">
                        {invite.teams?.name || (
                          <span className="text-muted-foreground/60 italic font-sans">
                            No team
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-1 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={revokeInviteMutation.isPending}
                          onClick={() => revokeInviteMutation.mutate(invite.id)}
                          className="h-7 w-7 rounded-[4px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}
