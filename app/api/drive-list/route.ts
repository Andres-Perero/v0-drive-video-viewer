import { createClient } from "@supabase/supabase-js"
import { google } from "googleapis"
import { NextResponse } from "next/server"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const driveCache = new Map<string, any>()
const CACHE_TTL = 1000 * 60 * 3 // 3 minutos

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const requestedFolderId = searchParams.get("folderId")
    const cacheKey = requestedFolderId || "root"

    // 🧠 Cache local en servidor
    if (driveCache.has(cacheKey)) {
      const cached = driveCache.get(cacheKey)
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        console.log(`[v0] Cache hit para ${cacheKey}`)
        return NextResponse.json(cached.data)
      } else driveCache.delete(cacheKey)
    }

    const { data, error } = await supabase.from("drive_credentials").select("credentials_json, ident_folder")

    if (error || !data) {
      console.error("Error obteniendo credenciales:", error)
      return NextResponse.json({ error: "Error obteniendo credenciales" }, { status: 500 })
    }

    const accounts = data.map((row, index) => ({
      credentials: row.credentials_json,
      defaultFolderId: row.ident_folder || "root",
      accountIndex: index,
    }))

    let allFiles: any[] = []

    if (requestedFolderId) {
      // Estamos navegando dentro de una carpeta específica
      // Paso 1: Obtener el nombre de la carpeta desde cualquier cuenta que la tenga
      let folderName: string | null = null

      for (const { credentials, defaultFolderId, accountIndex } of accounts) {
        try {
          const fixedPrivateKey = credentials.private_key?.replace(/\\n/g, "\n")
          const auth = new google.auth.JWT({
            email: credentials.client_email,
            key: fixedPrivateKey,
            scopes: ["https://www.googleapis.com/auth/drive.readonly"],
          })

          const drive = google.drive({ version: "v3", auth })

          // Intentar obtener metadata de la carpeta
          const folderMetadata = await drive.files.get({
            fileId: requestedFolderId,
            fields: "id, name",
          })

          if (folderMetadata.data.name) {
            folderName = folderMetadata.data.name
            //console.log(`[v0] Carpeta encontrada: "${folderName}" (ID: ${requestedFolderId})`)
            break
          }
        } catch (err) {
          // Esta cuenta no tiene acceso a este ID, continuar con la siguiente
          continue
        }
      }

      // Paso 2: Buscar TODAS las carpetas con ese nombre en TODAS las cuentas
      const folderSearchResults = await Promise.allSettled(
        accounts.map(async ({ credentials, defaultFolderId, accountIndex }) => {
          try {
            const fixedPrivateKey = credentials.private_key?.replace(/\\n/g, "\n")
            const auth = new google.auth.JWT({
              email: credentials.client_email,
              key: fixedPrivateKey,
              scopes: ["https://www.googleapis.com/auth/drive.readonly"],
            })

            const drive = google.drive({ version: "v3", auth })

            // Buscar carpetas con el mismo nombre
            const searchQuery = folderName
              ? `name = '${folderName.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder'`
              : `'${requestedFolderId}' in parents`

            const foldersResponse = await drive.files.list({
              q: searchQuery,
              fields: "files(id, name, parents)",
            })

            return {
              accountIndex,
              credentials,
              folderIds: (foldersResponse.data.files || []).map((f) => f.id!),
            }
          } catch (err) {
            console.error(`[v0] Error buscando carpetas en cuenta ${accountIndex}:`, err)
            return { accountIndex, credentials, folderIds: [] }
          }
        }),
      )

      // Paso 3: Obtener archivos de TODAS las carpetas encontradas
      const fileResults = await Promise.allSettled(
        folderSearchResults
          .filter((r) => r.status === "fulfilled")
          .flatMap((r) => {
            const { accountIndex, credentials, folderIds } = r.value
            return folderIds.map((folderId) => ({
              accountIndex,
              credentials,
              folderId,
            }))
          })
          .map(async ({ accountIndex, credentials, folderId }) => {
            try {
              const fixedPrivateKey = credentials.private_key?.replace(/\\n/g, "\n")
              const auth = new google.auth.JWT({
                email: credentials.client_email,
                key: fixedPrivateKey,
                scopes: ["https://www.googleapis.com/auth/drive.readonly"],
              })

              const drive = google.drive({ version: "v3", auth })

              const response = await drive.files.list({
                q: `'${folderId}' in parents and (mimeType = 'application/vnd.google-apps.folder' or mimeType contains 'video/')`,
                fields: "files(id, name, mimeType, thumbnailLink, iconLink, size, videoMediaMetadata)",
                orderBy: "folder,name",
              })

              const files = (response.data.files || []).map((file) => ({
                ...file,
                parentId: folderId,
                accountIndex,
                sourceEmail: credentials.client_email,
                thumbnailLink: file.thumbnailLink || `https://drive.google.com/thumbnail?id=${file.id}&sz=w320-h180`,
              }))

              //console.log(`[v0] Cuenta ${accountIndex}, Carpeta ${folderId}: ${files.length} archivos`)
              return files
            } catch (err) {
              console.error(`[v0] Error obteniendo archivos de carpeta ${folderId} en cuenta ${accountIndex}:`, err)
              return []
            }
          }),
      )

      allFiles = fileResults.filter((r) => r.status === "fulfilled").flatMap((r) => r.value)
    } else {
      // Estamos en root, usar la lógica original
      const results = await Promise.allSettled(
        accounts.map(async ({ credentials, defaultFolderId, accountIndex }) => {
          try {
            const fixedPrivateKey = credentials.private_key?.replace(/\\n/g, "\n")
            const auth = new google.auth.JWT({
              email: credentials.client_email,
              key: fixedPrivateKey,
              scopes: ["https://www.googleapis.com/auth/drive.readonly"],
            })

            const drive = google.drive({ version: "v3", auth })
            const targetFolderId = defaultFolderId.trim()

            const response = await drive.files.list({
              q: `'${targetFolderId}' in parents and (mimeType = 'application/vnd.google-apps.folder' or mimeType contains 'video/')`,
              fields: "files(id, name, mimeType, thumbnailLink, iconLink, size, videoMediaMetadata)",
              orderBy: "folder,name",
            })

            const files = (response.data.files || []).map((file) => ({
              ...file,
              parentId: targetFolderId,
              accountIndex,
              sourceEmail: credentials.client_email,
              thumbnailLink: file.thumbnailLink || `https://drive.google.com/thumbnail?id=${file.id}&sz=w320-h180`,
            }))

            return files
          } catch (err) {
            console.error(`[v0] Error en cuenta ${accountIndex}:`, err)
            throw err
          }
        }),
      )

      allFiles = results.filter((r) => r.status === "fulfilled").flatMap((r) => r.value)
    }

    const mergedStructure = mergeFoldersAndVideos(allFiles)

    // 🧠 Guardar cache
    driveCache.set(cacheKey, {
      timestamp: Date.now(),
      data: { files: mergedStructure },
    })

    //console.log(`[v0] Total archivos después de fusión: ${mergedStructure.length}`)
    //console.log(
    //  `[v0] Carpetas: ${mergedStructure.filter((f) => f.mimeType === "application/vnd.google-apps.folder").length}`,
    //)
    console.log(`[v0] Videos: ${mergedStructure.filter((f) => f.mimeType?.includes("video")).length}`)

    return NextResponse.json({ files: mergedStructure })
  } catch (err) {
    console.error("[v0] ERROR listando archivos:", err)
    return NextResponse.json(
      {
        error: "Error al listar archivos de Drive",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

function mergeFoldersAndVideos(files: any[]): any[] {
  // Separar carpetas y videos
  const folders = files.filter((f) => f.mimeType === "application/vnd.google-apps.folder")
  const videos = files.filter((f) => f.mimeType && f.mimeType.includes("video"))

  // Agrupar carpetas por nombre (fusionar carpetas con mismo nombre de diferentes drives)
  const folderMap = new Map<string, any>()

  for (const folder of folders) {
    const existing = folderMap.get(folder.name)

    if (!existing) {
      // Primera vez que vemos esta carpeta
      folderMap.set(folder.name, {
        ...folder,
        // Mantener array de IDs originales para navegación
        originalIds: [folder.id],
        accountIndexes: [folder.accountIndex],
        sourceEmails: [folder.sourceEmail],
      })
    } else {
      // Ya existe una carpeta con este nombre, agregar IDs adicionales
      existing.originalIds.push(folder.id)
      existing.accountIndexes.push(folder.accountIndex)
      existing.sourceEmails.push(folder.sourceEmail)
    }
  }

  // Convertir el mapa a array de carpetas fusionadas
  const mergedFolders = Array.from(folderMap.values())

  // Cada video tiene un ID único que combina accountIndex + fileId
  const allVideos = videos.map((video, index) => ({
    ...video,
    uniqueKey: `${video.accountIndex}-${video.id}-${index}`,
  }))

  //console.log(`[v0] Carpetas originales: ${folders.length}, Carpetas fusionadas: ${mergedFolders.length}`)
  console.log(`[v0] Videos totales: ${allVideos.length}`)

  // Retornar carpetas fusionadas + todos los videos
  return [...mergedFolders, ...allVideos]
}
