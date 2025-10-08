import { google } from "googleapis"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { fileId } = await request.json()

    if (!fileId) {
      return NextResponse.json({ error: "File ID is required" }, { status: 400 })
    }

    const serviceAccountJSON = process.env.GOOGLE_SERVICE_ACCOUNT_JSON

    if (!serviceAccountJSON) {
      return NextResponse.json({ error: "No credentials found" }, { status: 500 })
    }

    const credentials = JSON.parse(serviceAccountJSON)

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/drive"],
    })

    const drive = google.drive({ version: "v3", auth })

    // Check if file is already shared
    const permissions = await drive.permissions.list({
      fileId: fileId,
      fields: "permissions(id, type, role)",
    })

    const isPublic = permissions.data.permissions?.some((p) => p.type === "anyone")

    if (!isPublic) {
      // Make file viewable by anyone with the link
      await drive.permissions.create({
        fileId: fileId,
        requestBody: {
          role: "reader",
          type: "anyone",
        },
      })
      console.log("[v0] File made shareable:", fileId)
    }

    return NextResponse.json({ success: true, fileId })
  } catch (error) {
    console.error("[v0] ERROR in drive-share:", error)
    return NextResponse.json(
      {
        error: "Error sharing file",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
