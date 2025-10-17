// import { google } from "googleapis"
// import { NextResponse } from "next/server"

// export async function POST(request: Request) {
//   try {
//     const { fileId } = await request.json()

//     if (!fileId) {
//       return NextResponse.json({ error: "File ID is required" }, { status: 400 })
//     }

//     const serviceAccountJSON = process.env.GOOGLE_SERVICE_ACCOUNT_JSON

//     if (!serviceAccountJSON) {
//       return NextResponse.json({ error: "No credentials found" }, { status: 500 })
//     }

//     const credentials = JSON.parse(serviceAccountJSON)

//     const auth = new google.auth.GoogleAuth({
//       credentials,
//       scopes: ["https://www.googleapis.com/auth/drive"],
//     })

//     const drive = google.drive({ version: "v3", auth })

//     // Check if file is already shared
//     const permissions = await drive.permissions.list({
//       fileId: fileId,
//       fields: "permissions(id, type, role)",
//     })

//     const isPublic = permissions.data.permissions?.some((p) => p.type === "anyone")

//     if (!isPublic) {
//       // Make file viewable by anyone with the link
//       await drive.permissions.create({
//         fileId: fileId,
//         requestBody: {
//           role: "reader",
//           type: "anyone",
//         },
//       })
//       console.log("[v0] File made shareable:", fileId)
//     }

//     return NextResponse.json({ success: true, fileId })
//   } catch (error) {
//     console.error("[v0] ERROR in drive-share:", error)
//     return NextResponse.json(
//       {
//         error: "Error sharing file",
//         details: error instanceof Error ? error.message : "Unknown error",
//       },
//       { status: 500 },
//     )
//   }
// }
import { createClient } from "@supabase/supabase-js"
import { google } from "googleapis"
import { NextResponse } from "next/server"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { fileId } = await request.json()

    if (!fileId) {
      return NextResponse.json({ error: "File ID is required" }, { status: 400 })
    }

    console.log("[v0] Obteniendo credenciales desde Supabase...")
    const { data, error } = await supabase.from("drive_credentials").select("credentials_json")
    if (error || !data) {
      console.error("Error obteniendo credenciales:", error)
      return NextResponse.json({ error: "Error obteniendo credenciales" }, { status: 500 })
    }

    const accounts = data.map((row) => row.credentials_json)

    let shared = false
    let lastError: any = null

    // Intentar compartir con cada cuenta hasta que funcione
    for (const credentials of accounts) {
      try {
        const auth = new google.auth.GoogleAuth({
          credentials,
          scopes: ["https://www.googleapis.com/auth/drive"],
        })
        const drive = google.drive({ version: "v3", auth })

        // Revisar permisos existentes
        const permissions = await drive.permissions.list({
          fileId: fileId,
          fields: "permissions(id, type, role)",
        })

        const isPublic = permissions.data.permissions?.some((p) => p.type === "anyone")

        if (!isPublic) {
          await drive.permissions.create({
            fileId: fileId,
            requestBody: { role: "reader", type: "anyone" },
          })
          console.log("[v0] File made shareable:", fileId)
        }

        shared = true
        break // Si se logra compartir, no seguimos con otras cuentas
      } catch (err) {
        console.warn("[v0] Error compartiendo con esta cuenta, intentando siguiente...", err)
        lastError = err
      }
    }

    if (!shared) {
      return NextResponse.json(
        { error: "No se pudo compartir el archivo con ninguna cuenta", details: lastError },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, fileId })
  } catch (error) {
    console.error("[v0] ERROR in drive-share:", error)
    return NextResponse.json(
      {
        error: "Error compartiendo archivo",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
