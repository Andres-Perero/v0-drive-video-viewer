// import { google } from "googleapis"
// import type { NextRequest } from "next/server"

// export async function GET(request: NextRequest) {
//   console.log("[v0] Drive stream API called")

//   const searchParams = request.nextUrl.searchParams
//   const fileId = searchParams.get("fileId")

//   console.log("[v0] Requested fileId:", fileId)

//   if (!fileId) {
//     console.log("[v0] ERROR: fileId missing")
//     return new Response("fileId missing", { status: 400 })
//   }

//   try {
//     const serviceAccountJSON = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
//     console.log("[v0] Service account JSON exists:", !!serviceAccountJSON)

//     if (!serviceAccountJSON) {
//       console.log("[v0] ERROR: No credentials configured")
//       return new Response("No credentials configured", { status: 500 })
//     }

//     console.log("[v0] Parsing credentials for streaming...")
//     const credentials = JSON.parse(serviceAccountJSON)

//     const auth = new google.auth.GoogleAuth({
//       credentials,
//       scopes: ["https://www.googleapis.com/auth/drive.readonly"],
//     })

//     const drive = google.drive({ version: "v3", auth })

//     console.log("[v0] Getting file metadata and webContentLink...")

//     const meta = await drive.files.get({
//       fileId,
//       fields: "webContentLink, mimeType, size, name",
//     })

//     console.log("[v0] File metadata:", {
//       name: meta.data.name,
//       mimeType: meta.data.mimeType,
//       size: meta.data.size,
//     })

//     const mimeType = meta.data.mimeType || "application/octet-stream"
//     const fileSize = Number.parseInt(meta.data.size || "0", 10)

//     const range = request.headers.get("range")
//     console.log("[v0] Range header:", range)

//     let start = 0
//     let end = fileSize - 1
//     const CHUNK_SIZE = 10 * 1024 * 1024 // 10MB chunks for better streaming

//     const headers: Record<string, string> = {
//       "Content-Type": mimeType,
//       "Accept-Ranges": "bytes",
//       "Cache-Control": "public, max-age=3600",
//       "Access-Control-Allow-Origin": "*",
//     }

//     const driveHeaders: Record<string, string> = {}

//     if (range) {
//       const bytesPrefix = "bytes="
//       if (range.startsWith(bytesPrefix)) {
//         const parts = range.replace(bytesPrefix, "").split("-")
//         start = Number.parseInt(parts[0], 10) || 0
//         end = parts[1] ? Number.parseInt(parts[1], 10) : Math.min(start + CHUNK_SIZE - 1, fileSize - 1)
//         driveHeaders.Range = `bytes=${start}-${end}`

//         headers["Content-Range"] = `bytes ${start}-${end}/${fileSize}`
//         headers["Content-Length"] = String(end - start + 1)

//         console.log("[v0] Streaming optimized range:", `${start}-${end}/${fileSize}`)
//       }
//     } else {
//       end = Math.min(CHUNK_SIZE - 1, fileSize - 1)
//       driveHeaders.Range = `bytes=${start}-${end}`
//       headers["Content-Range"] = `bytes ${start}-${end}/${fileSize}`
//       headers["Content-Length"] = String(end - start + 1)
//       console.log("[v0] Streaming initial chunk:", `${start}-${end}/${fileSize}`)
//     }

//     console.log("[v0] Starting optimized stream...")
//     const driveRes = await drive.files.get(
//       { fileId, alt: "media" },
//       {
//         responseType: "stream",
//         headers: driveHeaders,
//         timeout: 30000,
//       },
//     )

//     const stream = new ReadableStream({
//       start(controller) {
//         driveRes.data.on("data", (chunk: Buffer) => {
//           controller.enqueue(chunk)
//         })
//         driveRes.data.on("end", () => {
//           console.log("[v0] Stream completed successfully")
//           controller.close()
//         })
//         driveRes.data.on("error", (err: Error) => {
//           console.error("[v0] Stream error:", err)
//           controller.error(err)
//         })
//       },
//     })

//     return new Response(stream, {
//       status: 206, // Always use 206 for partial content
//       headers,
//     })
//   } catch (error) {
//     console.error("[v0] ERROR streaming file:", error)
//     return new Response(
//       JSON.stringify({
//         error: error instanceof Error ? error.message : "Unknown error",
//         stack: error instanceof Error ? error.stack : undefined,
//       }),
//       {
//         status: 500,
//         headers: { "Content-Type": "application/json" },
//       },
//     )
//   }
// }
import { createClient } from "@supabase/supabase-js"
import { google } from "googleapis"
import type { NextRequest } from "next/server"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const fileId = searchParams.get("fileId")

  console.log("[v0] Requested fileId:", fileId)

  if (!fileId) {
    return new Response("fileId missing", { status: 400 })
  }

  console.log("[v0] Obteniendo credenciales desde Supabase...")
  const { data, error } = await supabase.from("drive_credentials").select("credentials_json")
  if (error || !data || data.length === 0) {
    console.error("Error obteniendo credenciales:", error)
    return new Response("Error obteniendo credenciales", { status: 500 })
  }

  const accounts = data.map((row) => row.credentials_json)

  let lastError: any = null
  for (const credentials of accounts) {
    try {
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ["https://www.googleapis.com/auth/drive.readonly"],
      })
      const drive = google.drive({ version: "v3", auth })

      console.log("[v0] Getting file metadata and webContentLink...")
      const meta = await drive.files.get({
        fileId,
        fields: "webContentLink, mimeType, size, name",
      })

      const mimeType = meta.data.mimeType || "application/octet-stream"
      const fileSize = Number.parseInt(meta.data.size || "0", 10)

      const range = request.headers.get("range")
      let start = 0
      let end = fileSize - 1
      const CHUNK_SIZE = 10 * 1024 * 1024 // 10MB

      const headers: Record<string, string> = {
        "Content-Type": mimeType,
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
      }

      const driveHeaders: Record<string, string> = {}

      if (range) {
        const bytesPrefix = "bytes="
        if (range.startsWith(bytesPrefix)) {
          const parts = range.replace(bytesPrefix, "").split("-")
          start = Number.parseInt(parts[0], 10) || 0
          end = parts[1] ? Number.parseInt(parts[1], 10) : Math.min(start + CHUNK_SIZE - 1, fileSize - 1)
          driveHeaders.Range = `bytes=${start}-${end}`
          headers["Content-Range"] = `bytes ${start}-${end}/${fileSize}`
          headers["Content-Length"] = String(end - start + 1)
        }
      } else {
        end = Math.min(CHUNK_SIZE - 1, fileSize - 1)
        driveHeaders.Range = `bytes=${start}-${end}`
        headers["Content-Range"] = `bytes ${start}-${end}/${fileSize}`
        headers["Content-Length"] = String(end - start + 1)
      }

      console.log("[v0] Starting optimized stream...")
      const driveRes = await drive.files.get(
        { fileId, alt: "media" },
        { responseType: "stream", headers: driveHeaders, timeout: 30000 }
      )

      const stream = new ReadableStream({
        start(controller) {
          driveRes.data.on("data", (chunk: Buffer) => controller.enqueue(chunk))
          driveRes.data.on("end", () => controller.close())
          driveRes.data.on("error", (err: Error) => controller.error(err))
        },
      })

      return new Response(stream, { status: 206, headers })
    } catch (err) {
      console.warn("[v0] Error con esta cuenta, intentando siguiente...", err)
      lastError = err
    }
  }

  return new Response(
    JSON.stringify({
      error: "No se pudo acceder al archivo con ninguna cuenta",
      details: lastError,
    }),
    { status: 500, headers: { "Content-Type": "application/json" } }
  )
}
