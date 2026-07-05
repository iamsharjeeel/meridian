"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { Plus, Edit2, Trash2, Shield, Users } from "lucide-react"

interface Member {
  id: string
  full_name: string
  email: string
  role: string
}

interface Team {
  id: string
  name: string
  manager_id: string | null
  created_at: string
  manager: {
    full_name: string
    email: string
  } | null
}

interface TeamsClientProps {
  initialTeams: Team[]
  members: Member[]
  currentUserRole: string
  orgId: string
}

export function TeamsClient({
  initialTeams,
  members,
  currentUserRole,
  orgId,
}: TeamsClientProps) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const isDocAdmin = currentUserRole === "owner" || currentUserRole === "admin"

  // Dialog States
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [isEditOpen, setIsEditOpen] = React.useState(false)
  const [selectedTeam, setSelectedTeam] = React.useState<Team | null>(null)

  // Form States
  const [teamName, setTeamName] = React.useState("")
  const [managerId, setManagerId] = React.useState<string>("none")
  const [error, setError] = React.useState<string | null>(null)

  // 1. Fetch Teams
  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ["teams"],
    queryFn: async () => {
      const { data } = await supabase
        .from("teams")
        .select("*, manager:profiles ( full_name, email )")
        .order("name")
      return (data as any) || []
    },
    initialData: initialTeams,
  })

  // 2. Create Mutation
  const createMutation = useMutation({
    mutationFn: async (newTeam: { name: string; manager_id: string | null }) => {
      const { data, error } = await supabase
        .from("teams")
        .insert({
          org_id: orgId,
          name: newTeam.name.trim(),
          manager_id: newTeam.manager_id,
        })
        .select("*, manager:profiles ( full_name, email )")
        .single()

      if (error) throw error
      return data
    },
    onMutate: async (newTeam) => {
      await queryClient.cancelQueries({ queryKey: ["teams"] })
      const previousTeams = queryClient.getQueryData<Team[]>(["teams"])
      if (previousTeams) {
        const tempTeam: Team = {
          id: Math.random().toString(),
          name: newTeam.name,
          manager_id: newTeam.manager_id,
          created_at: new Date().toISOString(),
          manager: newTeam.manager_id
            ? {
                full_name: members.find((m) => m.id === newTeam.manager_id)?.full_name || "",
                email: members.find((m) => m.id === newTeam.manager_id)?.email || "",
              }
            : null,
        }
        queryClient.setQueryData<Team[]>(["teams"], [...previousTeams, tempTeam])
      }
      return { previousTeams }
    },
    onError: (err, variables, context) => {
      if (context?.previousTeams) {
        queryClient.setQueryData(["teams"], context.previousTeams)
      }
      setError(err.message)
    },
    onSuccess: () => {
      setTeamName("")
      setManagerId("none")
      setIsCreateOpen(false)
      setError(null)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] })
    },
  })

  // 3. Update Mutation
  const updateMutation = useMutation({
    mutationFn: async (updated: { id: string; name: string; manager_id: string | null }) => {
      const { data, error } = await supabase
        .from("teams")
        .update({
          name: updated.name.trim(),
          manager_id: updated.manager_id,
        })
        .eq("id", updated.id)
        .select("*, manager:profiles ( full_name, email )")
        .single()

      if (error) throw error
      return data
    },
    onMutate: async (updated) => {
      await queryClient.cancelQueries({ queryKey: ["teams"] })
      const previousTeams = queryClient.getQueryData<Team[]>(["teams"])
      if (previousTeams) {
        queryClient.setQueryData<Team[]>(
          ["teams"],
          previousTeams.map((t) =>
            t.id === updated.id
              ? {
                  ...t,
                  name: updated.name,
                  manager_id: updated.manager_id,
                  manager: updated.manager_id
                    ? {
                        full_name: members.find((m) => m.id === updated.manager_id)?.full_name || "",
                        email: members.find((m) => m.id === updated.manager_id)?.email || "",
                      }
                    : null,
                }
              : t
          )
        )
      }
      return { previousTeams }
    },
    onError: (err, variables, context) => {
      if (context?.previousTeams) {
        queryClient.setQueryData(["teams"], context.previousTeams)
      }
      setError(err.message)
    },
    onSuccess: () => {
      setSelectedTeam(null)
      setIsEditOpen(false)
      setError(null)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] })
    },
  })

  // 4. Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("teams").delete().eq("id", id)
      if (error) throw error
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["teams"] })
      const previousTeams = queryClient.getQueryData<Team[]>(["teams"])
      if (previousTeams) {
        queryClient.setQueryData<Team[]>(
          ["teams"],
          previousTeams.filter((t) => t.id !== id)
        )
      }
      return { previousTeams }
    },
    onError: (err, id, context) => {
      if (context?.previousTeams) {
        queryClient.setQueryData(["teams"], context.previousTeams)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] })
    },
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!teamName) return

    createMutation.mutate({
      name: teamName,
      manager_id: managerId === "none" ? null : managerId,
    })
  }

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!selectedTeam || !teamName) return

    updateMutation.mutate({
      id: selectedTeam.id,
      name: teamName,
      manager_id: managerId === "none" ? null : managerId,
    })
  }

  const openEdit = (team: Team) => {
    setSelectedTeam(team)
    setTeamName(team.name)
    setManagerId(team.manager_id || "none")
    setError(null)
    setIsEditOpen(true)
  }

  const openCreate = () => {
    setTeamName("")
    setManagerId("none")
    setError(null)
    setIsCreateOpen(true)
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-[-0.02em] text-foreground font-sans">
            Teams
          </h1>
          <p className="text-xs text-muted-foreground font-sans">
            Manage your organization's teams and department managers.
          </p>
        </div>

        {/* Create Team Button (Admin-only) */}
        {isDocAdmin && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger render={
              <Button onClick={openCreate} className="rounded-[4px] bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-medium tracking-wide uppercase h-9 px-4 transition-all active:scale-[0.97]">
                <Plus className="mr-2 h-4 w-4" />
                Create Team
              </Button>
            } />
            <DialogContent className="max-w-[400px] rounded-[4px] border-border bg-surface-1 font-sans">
              <DialogHeader>
                <DialogTitle className="text-sm font-bold tracking-tight">
                  Create Team
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Add a new department or team inside your organization.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleCreate} className="space-y-4 py-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Team Name
                  </label>
                  <Input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="Engineering"
                    required
                    className="rounded-[4px] border-border bg-surface-2 text-sm focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0 focus-visible:border-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Assign Manager (Optional)
                  </label>
                  <Select value={managerId} onValueChange={(val) => setManagerId(val || "none")}>
                    <SelectTrigger className="rounded-[4px] border-border bg-surface-2 text-sm h-9 focus:ring-1 focus:ring-primary focus:ring-offset-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-[4px] border-border bg-surface-2 text-xs">
                      <SelectItem value="none">No Manager</SelectItem>
                      {members.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {error && (
                  <div className="rounded-[4px] border border-destructive/20 bg-destructive/10 p-2 text-xs text-destructive">
                    {error}
                  </div>
                )}

                <DialogFooter className="pt-2">
                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="w-full rounded-[4px] bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-medium tracking-wide uppercase h-9"
                  >
                    {createMutation.isPending ? "Creating..." : "Create Team"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Teams Directory */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-sans">
          <Shield className="h-3.5 w-3.5 text-muted-foreground" />
          Active Departments ({teams.length})
        </h2>
        <div className="rounded-[4px] border border-border bg-surface-1 overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground h-9 font-sans">
                  Team Name
                </TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground h-9 font-sans">
                  Manager
                </TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground h-9 font-sans">
                  Created Date
                </TableHead>
                {isDocAdmin && (
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground h-9 font-sans text-right">
                    Actions
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {teams.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isDocAdmin ? 4 : 3} className="h-24 text-center text-xs text-muted-foreground font-sans italic">
                    No teams created yet.
                  </TableCell>
                </TableRow>
              ) : (
                teams.map((team) => (
                  <TableRow key={team.id} className="border-border hover:bg-secondary/40">
                    <TableCell className="py-2.5 text-xs font-semibold text-foreground font-sans">
                      {team.name}
                    </TableCell>
                    <TableCell className="py-2.5 text-xs text-foreground font-sans">
                      {team.manager ? (
                        <div>
                          <p className="font-medium text-foreground">{team.manager.full_name}</p>
                          <p className="text-[10px] text-muted-foreground">{team.manager.email}</p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground/60 italic font-sans">
                          No manager assigned
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-2.5 text-xs font-tabular text-muted-foreground font-mono select-none">
                      {new Date(team.created_at).toLocaleDateString()}
                    </TableCell>
                    {isDocAdmin && (
                      <TableCell className="py-1 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(team)}
                            className="h-7 w-7 rounded-[4px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete ${team.name}?`)) {
                                deleteMutation.mutate(team.id)
                              }
                            }}
                            disabled={deleteMutation.isPending}
                            className="h-7 w-7 rounded-[4px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Edit Team Dialog */}
      {selectedTeam && (
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-[400px] rounded-[4px] border-border bg-surface-1 font-sans">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold tracking-tight">
                Edit Team
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Update the team name or modify manager assignments.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleUpdate} className="space-y-4 py-2">
              <div className="space-y-1">
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Team Name
                </label>
                <Input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Engineering"
                  required
                  className="rounded-[4px] border-border bg-surface-2 text-sm focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0 focus-visible:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Assign Manager
                </label>
                <Select value={managerId} onValueChange={(val) => setManagerId(val || "none")}>
                  <SelectTrigger className="rounded-[4px] border-border bg-surface-2 text-sm h-9 focus:ring-1 focus:ring-primary focus:ring-offset-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-[4px] border-border bg-surface-2 text-xs">
                    <SelectItem value="none">No Manager</SelectItem>
                    {members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {error && (
                <div className="rounded-[4px] border border-destructive/20 bg-destructive/10 p-2 text-xs text-destructive">
                  {error}
                </div>
              )}

              <DialogFooter className="pt-2">
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="w-full rounded-[4px] bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-medium tracking-wide uppercase h-9"
                >
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
