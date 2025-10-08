import { google } from "googleapis"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  console.log("[v0] Drive list API called")

  try {
    const { searchParams } = new URL(request.url)
    const folderId = searchParams.get("folderId") || "1xpSGA10s9nbUTTkywiTwunXP3cE-mNcn"

    const serviceAccountJSON = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
    console.log("[v0] Service account JSON exists:", !!serviceAccountJSON)

    if (!serviceAccountJSON) {
      console.log("[v0] ERROR: No credentials found")
      return NextResponse.json({ error: "No se encontraron credenciales de Google Drive" }, { status: 500 })
    }

    console.log("[v0] Parsing credentials...")
    const credentials = JSON.parse(serviceAccountJSON)
    console.log("[v0] Credentials parsed successfully, client_email:", credentials.client_email)

    console.log("[v0] Setting up Google Auth...")
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    })

    const drive = google.drive({ version: "v3", auth })
    console.log("[v0] Drive client created")

    console.log("[v0] Fetching files from folder:", folderId)

    const response = await drive.files.list({
      q: `'${folderId}' in parents and (mimeType = 'application/vnd.google-apps.folder' or mimeType contains 'video/')`,
      fields: "files(id, name, mimeType, thumbnailLink, size, videoMediaMetadata)",
      orderBy: "folder,name",
    })

    console.log("[v0] Files found:", response.data.files?.length || 0)
    console.log("[v0] Files:", JSON.stringify(response.data.files, null, 2))

    return NextResponse.json({
      files: response.data.files || [],
      currentFolderId: folderId,
    })
  } catch (error) {
    console.error("[v0] ERROR in drive-list:", error)
    return NextResponse.json(
      {
        error: "Error al listar archivos de Drive",
        details: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
