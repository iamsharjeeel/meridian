import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { createAdminClient } from "@/utils/supabase/admin"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

// Helper to check if caller is owner/admin
async function checkAdminAccess() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Unauthorized", status: 401 }
  }

  // Fetch caller's profile to inspect role and org_id
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role, org_id")
    .eq("id", user.id)
    .maybeSingle()

  if (error || !profile) {
    return { error: "User profile not found", status: 404 }
  }

  if (profile.role !== "owner" && profile.role !== "admin") {
    return { error: "Forbidden: Admin access required", status: 403 }
  }

  return { caller: profile, user }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await checkAdminAccess()
    if (authResult.error || !authResult.caller) {
      return NextResponse.json({ error: authResult.error || "Unauthorized" }, { status: authResult.status || 401 })
    }

    const { caller } = authResult
    const body = await request.json()
    const { email, role, team_id } = body

    if (!email || !role) {
      return NextResponse.json({ error: "Email and role are required fields" }, { status: 400 })
    }

    // Generate secure token
    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days expiration

    const admin = createAdminClient()

    // Insert invite row
    const { data: invite, error: inviteError } = await admin
      .from("invites")
      .insert({
        org_id: caller.org_id,
        email: email.trim().toLowerCase(),
        role,
        team_id: team_id || null,
        token,
        invited_by: caller.id,
        expires_at: expiresAt,
      })
      .select("*, organizations(name)")
      .single()

    if (inviteError || !invite) {
      console.error("Invite insertion error:", inviteError)
      return NextResponse.json({ error: inviteError?.message || "Failed to create invite in database" }, { status: 500 })
    }

    const orgName = (invite as any).organizations?.name || "MERIDIAN"
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "")
    const inviteLink = `${appUrl}/invite/${token}`

    // Send styled branded email via Resend
    // We try hello@cadencemail.s1mplesolutions.cc as it is verified in the env
    const fromEmail = "hello@cadencemail.s1mplesolutions.cc"
    const subject = `Join ${orgName} on MERIDIAN`

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Join ${orgName} on MERIDIAN</title>
        <style>
          body {
            background-color: #0A0A0B;
            color: #F5F5F7;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            margin: 0;
            padding: 40px 20px;
          }
          .container {
            max-width: 480px;
            margin: 0 auto;
            background-color: #141416;
            border: 1px solid #1C1C1F;
            border-radius: 4px;
            padding: 32px;
            text-align: center;
          }
          h1 {
            font-size: 20px;
            font-weight: 700;
            letter-spacing: -0.02em;
            margin-top: 0;
            margin-bottom: 24px;
            color: #F5F5F7;
          }
          p {
            font-size: 13px;
            color: #8E8E93;
            line-height: 1.5;
            margin-bottom: 28px;
          }
          .btn {
            display: inline-block;
            background-color: #4F7CFF;
            color: #FFFFFF !important;
            text-decoration: none;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            padding: 12px 24px;
            border-radius: 4px;
            margin-bottom: 28px;
          }
          .footer {
            font-size: 10px;
            color: #44444F;
            margin-top: 24px;
            border-top: 1px solid #1C1C1F;
            padding-top: 16px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>MERIDIAN</h1>
          <p>You have been invited to join <strong>${orgName}</strong> as a <strong>${role}</strong>.</p>
          <a class="btn" href="${inviteLink}">Accept Invitation</a>
          <p style="font-size: 11px; margin-bottom: 0;">This link will expire in 7 days. If you did not expect this invite, please ignore this email.</p>
          <div class="footer">
            &copy; ${new Date().getFullYear()} MERIDIAN. All rights reserved.
          </div>
        </div>
      </body>
      </html>
    `

    try {
      await resend.emails.send({
        from: `MERIDIAN <${fromEmail}>`,
        to: email.trim().toLowerCase(),
        subject: subject,
        html: htmlContent,
      })
    } catch (emailErr) {
      console.error("Resend email sending failure:", emailErr)
      // We still return success but note the email failed
      return NextResponse.json({
        success: true,
        message: "Invite created in DB, but sending email failed.",
        invite,
      })
    }

    return NextResponse.json({ success: true, invite })
  } catch (err: any) {
    console.error("Invite API Handler Error:", err)
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await checkAdminAccess()
    if (authResult.error || !authResult.caller) {
      return NextResponse.json({ error: authResult.error || "Unauthorized" }, { status: authResult.status || 401 })
    }

    const { caller } = authResult

    const searchParams = request.nextUrl.searchParams
    const inviteId = searchParams.get("id")

    if (!inviteId) {
      return NextResponse.json({ error: "Invite ID is required" }, { status: 400 })
    }

    const admin = createAdminClient()

    // Delete the pending invite
    const { error: deleteError } = await admin
      .from("invites")
      .delete()
      .eq("id", inviteId)
      .eq("org_id", caller.org_id) // Scope delete to current org only

    if (deleteError) {
      console.error("Invite deletion error:", deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("Invite API Delete Handler Error:", err)
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 })
  }
}
