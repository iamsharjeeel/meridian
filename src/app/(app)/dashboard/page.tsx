import * as React from "react"
import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single()

  const formattedDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="space-y-6">
      {/* Welcome Heading */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-[-0.02em] text-foreground font-sans">
            Welcome back, {profile?.full_name || "Member"}
          </h1>
          <p className="text-xs text-muted-foreground font-sans">
            Your role is{" "}
            <span className="font-semibold text-foreground font-tabular">
              {profile?.role}
            </span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground font-sans">Today's Date</p>
          <p className="text-xs font-semibold text-foreground font-tabular">
            {formattedDate}
          </p>
        </div>
      </div>

      {/* Widgets Empty State Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-[4px] border border-border bg-surface-1 p-5 space-y-3 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Timesheets Overview
          </p>
          <div className="h-28 flex items-center justify-center border border-dashed border-border rounded-[4px]">
            <p className="text-xs text-muted-foreground/60 font-sans italic">
              No active timesheets. Widgets coming soon.
            </p>
          </div>
        </div>

        <div className="rounded-[4px] border border-border bg-surface-1 p-5 space-y-3 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Team Presence
          </p>
          <div className="h-28 flex items-center justify-center border border-dashed border-border rounded-[4px]">
            <p className="text-xs text-muted-foreground/60 font-sans italic">
              All team members are accounted for.
            </p>
          </div>
        </div>

        <div className="rounded-[4px] border border-border bg-surface-1 p-5 space-y-3 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Payroll Calendar
          </p>
          <div className="h-28 flex items-center justify-center border border-dashed border-border rounded-[4px]">
            <p className="text-xs text-muted-foreground/60 font-sans italic">
              Next pay period starts in{" "}
              <span className="font-tabular not-italic font-semibold text-foreground">
                12
              </span>{" "}
              days.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
