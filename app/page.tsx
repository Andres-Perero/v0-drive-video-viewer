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
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
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
      setLoading(true)
      setError(null)
      const response = await fetch(currentFolderId ? `/api/drive-list?folderId=${currentFolderId}` : `/api/drive-list`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.details || "Error al cargar los archivos")
      }

      const data = await response.json()
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
    setFolderHistory([...folderHistory, { id: currentFolderId || "", name: "Carpeta anterior" }])
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
    setCurrentFolderId(null)
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
        <div className="container mx-auto px-3 sm:px-4 py-2.5 sm:py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                <Film className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary-foreground" />
              </div>
              <h1 className="text-base sm:text-lg font-bold text-foreground truncate">DriveVideo</h1>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="h-7 w-7 sm:h-8 sm:w-8 p-0"
              >
                {theme === "dark" ? (
                  <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                ) : (
                  <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                )}
              </Button>
              {currentFolderId !== null && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGoToRoot}
                  className="h-7 sm:h-8 px-2 sm:px-3 bg-transparent"
                >
                  <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Inicio</span>
                </Button>
              )}
              {folderHistory.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBackClick}
                  className="h-7 sm:h-8 px-2 sm:px-3 bg-transparent"
                >
                  <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Atrás</span>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={fetchItems}
                disabled={loading}
                className="h-7 sm:h-8 px-2 sm:px-3 bg-transparent hidden xs:flex"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" /> : "Actualizar"}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 animate-spin text-primary" />
            <p className="text-sm sm:text-base text-muted-foreground">Cargando archivos...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <Film className="w-7 h-7 sm:w-8 sm:h-8 text-destructive" />
            </div>
            <p className="text-sm sm:text-base text-destructive font-medium text-center px-4">{error}</p>
            <Button onClick={fetchItems} variant="outline" size="sm">
              Reintentar
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-muted flex items-center justify-center">
              <Film className="w-7 h-7 sm:w-8 sm:h-8 text-muted-foreground" />
            </div>
            <p className="text-sm sm:text-base text-muted-foreground">No se encontraron archivos</p>
          </div>
        ) : (
          <>
            {folders.length > 0 && (
              <div className="mb-5 sm:mb-6">
                <h2 className="text-sm sm:text-base font-semibold text-foreground mb-2.5 sm:mb-3 flex items-center gap-2">
                  <Folder className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                  Carpetas
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2.5 sm:gap-3">
                  {folders.map((folder) => (
                    <Card
                      key={folder.id}
                      className="group overflow-hidden hover:shadow-md hover:border-primary/50 transition-all duration-200 cursor-pointer border bg-card/50 backdrop-blur-sm"
                      onClick={() => handleItemClick(folder)}
                    >
                      <div className="relative aspect-square bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 overflow-hidden">
                        <div className="w-full h-full flex items-center justify-center">
                          <Folder className="w-8 h-8 sm:w-10 sm:h-10 text-primary/70 group-hover:scale-110 group-hover:text-primary transition-all duration-200" />
                        </div>
                      </div>
                      <div className="p-1.5 sm:p-2">
                        <h3 className="font-medium text-foreground text-[11px] sm:text-xs line-clamp-2 leading-tight">
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
                <h2 className="text-sm sm:text-base font-semibold text-foreground mb-2.5 sm:mb-3 flex items-center gap-2">
                  <Film className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                  Videos ({videos.length})
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2.5 sm:gap-3">
                  {videos.map((video, index) => (
                    <Card
                      key={index}
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
                            <Film className="w-6 h-6 sm:w-8 sm:h-8 text-primary/40" />
                          </div>
                        )}
                        {formatDuration(video.videoMediaMetadata?.durationMillis) && (
                          <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded">
                            {formatDuration(video.videoMediaMetadata?.durationMillis)}
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/90 flex items-center justify-center transform scale-90 group-hover:scale-100 transition-transform duration-200">
                            <Play className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground ml-0.5" />
                          </div>
                        </div>
                      </div>
                      <div className="p-1.5 sm:p-2">
                        <h3 className="font-medium text-foreground text-[11px] sm:text-xs line-clamp-2 leading-tight mb-0.5 sm:mb-1">
                          {video.name}
                        </h3>
                        <span className="text-[9px] sm:text-[10px] text-muted-foreground">
                          {formatFileSize(video.size)}
                        </span>
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
