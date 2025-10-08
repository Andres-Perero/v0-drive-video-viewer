"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Play, Loader2, Film, Folder, ArrowLeft, Moon, Sun, Home } from "lucide-react"
import VideoPlayer from "@/components/video-player"

interface DriveFile {
  id: string
  name: string
  mimeType: string
  thumbnailLink?: string
  size?: string
  videoMediaMetadata?: {
    durationMillis?: string
  }
}

export default function HomePage() {
  const [items, setItems] = useState<DriveFile[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVideo, setSelectedVideo] = useState<DriveFile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const ROOT_FOLDER_ID = "1xpSGA10s9nbUTTkywiTwunXP3cE-mNcn"
  const [currentFolderId, setCurrentFolderId] = useState<string>(ROOT_FOLDER_ID)
  const [folderHistory, setFolderHistory] = useState<Array<{ id: string; name: string }>>([])
  const [theme, setTheme] = useState<"light" | "dark">("dark")

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
  }, [theme])

  useEffect(() => {
    fetchItems()
  }, [currentFolderId])

  const fetchItems = async () => {
    try {
      console.log("[v0] Fetching items from API...")
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/drive-list?folderId=${currentFolderId}`)

      console.log("[v0] API response status:", response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.log("[v0] API error response:", errorData)
        throw new Error(errorData.details || "Error al cargar los archivos")
      }

      const data = await response.json()
      console.log("[v0] Items loaded:", data.files?.length || 0)
      setItems(data.files || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido"
      console.error("[v0] Error fetching items:", errorMessage)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleFolderClick = (folder: DriveFile) => {
    setFolderHistory([...folderHistory, { id: currentFolderId, name: "Carpeta anterior" }])
    setCurrentFolderId(folder.id)
  }

  const handleBackClick = () => {
    if (folderHistory.length > 0) {
      const previous = folderHistory[folderHistory.length - 1]
      setCurrentFolderId(previous.id)
      setFolderHistory(folderHistory.slice(0, -1))
    }
  }

  const handleItemClick = async (item: DriveFile) => {
    if (item.mimeType === "application/vnd.google-apps.folder") {
      handleFolderClick(item)
    } else {
      setSelectedVideo(item)
    }
  }

  const formatFileSize = (bytes?: string) => {
    if (!bytes) return "N/A"
    const size = Number.parseInt(bytes)
    if (size < 1024) return size + " B"
    if (size < 1024 * 1024) return (size / 1024).toFixed(1) + " KB"
    if (size < 1024 * 1024 * 1024) return (size / (1024 * 1024)).toFixed(1) + " MB"
    return (size / (1024 * 1024 * 1024)).toFixed(1) + " GB"
  }

  const formatDuration = (durationMillis?: string) => {
    if (!durationMillis) return null
    const totalSeconds = Math.floor(Number.parseInt(durationMillis) / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
    }
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  const handleGoToRoot = () => {
    setCurrentFolderId(ROOT_FOLDER_ID)
    setFolderHistory([])
  }

  const folders = items.filter((item) => item.mimeType === "application/vnd.google-apps.folder")
  const videos = items.filter((item) => item.mimeType.includes("video"))

  if (selectedVideo) {
    return <VideoPlayer video={selectedVideo} onClose={() => setSelectedVideo(null)} />
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Film className="w-4 h-4 text-primary-foreground" />
              </div>
              <h1 className="text-lg font-bold text-foreground">DriveVideo</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="h-8"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
              {currentFolderId !== ROOT_FOLDER_ID && (
                <Button variant="outline" size="sm" onClick={handleGoToRoot} className="h-8 bg-transparent">
                  <Home className="w-4 h-4 mr-1" />
                  Inicio
                </Button>
              )}
              {folderHistory.length > 0 && (
                <Button variant="outline" size="sm" onClick={handleBackClick} className="h-8 bg-transparent">
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Atrás
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={fetchItems}
                disabled={loading}
                className="h-8 bg-transparent"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Actualizar"}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Cargando archivos...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <Film className="w-8 h-8 text-destructive" />
            </div>
            <p className="text-destructive font-medium">{error}</p>
            <Button onClick={fetchItems} variant="outline">
              Reintentar
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Film className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No se encontraron archivos</p>
          </div>
        ) : (
          <>
            {folders.length > 0 && (
              <div className="mb-6">
                <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Folder className="w-4 h-4 text-primary" />
                  Carpetas
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-3">
                  {folders.map((folder) => (
                    <Card
                      key={folder.id}
                      className="group overflow-hidden hover:shadow-md hover:border-primary/50 transition-all duration-200 cursor-pointer border bg-card/50 backdrop-blur-sm"
                      onClick={() => handleItemClick(folder)}
                    >
                      <div className="relative aspect-square bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 overflow-hidden">
                        <div className="w-full h-full flex items-center justify-center">
                          <Folder className="w-10 h-10 text-primary/70 group-hover:scale-110 group-hover:text-primary transition-all duration-200" />
                        </div>
                      </div>
                      <div className="p-2">
                        <h3 className="font-medium text-foreground text-xs line-clamp-2 leading-tight">
                          {folder.name}
                        </h3>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {videos.length > 0 && (
              <div>
                <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Film className="w-4 h-4 text-primary" />
                  Videos ({videos.length})
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-3">
                  {videos.map((video) => (
                    <Card
                      key={video.id}
                      className="group overflow-hidden hover:shadow-md hover:border-primary/50 transition-all duration-200 cursor-pointer border bg-card/50 backdrop-blur-sm"
                      onClick={() => handleItemClick(video)}
                    >
                      <div className="relative aspect-video bg-muted overflow-hidden">
                        {video.thumbnailLink ? (
                          <img
                            src={video.thumbnailLink || "/placeholder.svg"}
                            alt={video.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                            <Film className="w-8 h-8 text-primary/40" />
                          </div>
                        )}
                        {formatDuration(video.videoMediaMetadata?.durationMillis) && (
                          <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded">
                            {formatDuration(video.videoMediaMetadata?.durationMillis)}
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                          <div className="w-10 h-10 rounded-full bg-primary/90 flex items-center justify-center transform scale-90 group-hover:scale-100 transition-transform duration-200">
                            <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
                          </div>
                        </div>
                      </div>
                      <div className="p-2">
                        <h3 className="font-medium text-foreground text-xs line-clamp-2 leading-tight mb-1">
                          {video.name}
                        </h3>
                        <span className="text-[10px] text-muted-foreground">{formatFileSize(video.size)}</span>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
