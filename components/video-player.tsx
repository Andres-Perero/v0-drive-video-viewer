"use client"
import { Play } from "lucide-react"
import { useState, useEffect } from "react"

interface VideoPlayerProps {
  video: {
    id: string
    name: string
    mimeType: string
  }
  onClose: () => void
}

export default function VideoPlayer({ video, onClose }: VideoPlayerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showPlayButton, setShowPlayButton] = useState(true)

  const embedUrl = `https://drive.google.com/file/d/${video.id}/preview`

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen()
      setIsFullscreen(false)
    } else {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    }
  }

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (document.fullscreenElement) {
          document.exitFullscreen()
        } else {
          onClose()
        }
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault()
        toggleFullscreen()
      }
    }

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    window.addEventListener("keydown", handleKeyPress)
    document.addEventListener("fullscreenchange", handleFullscreenChange)

    return () => {
      window.removeEventListener("keydown", handleKeyPress)
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-2 sm:p-4" onClick={onClose}>
      <div
        className={`relative w-full bg-black rounded-lg overflow-hidden shadow-2xl ${
          isFullscreen ? "h-full max-w-none max-h-none" : "max-w-5xl max-h-[100vh]"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/90 to-transparent p-2 sm:p-3">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-semibold text-xs sm:text-sm md:text-base line-clamp-1 text-balance max-w-[80%] pr-2">
              {video.name}
            </h2>
          </div>
        </div>

        {/* Video Container */}
        <div className="relative bg-black aspect-video">
          {showPlayButton && (
            <div
              className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 cursor-pointer"
              onClick={() => setShowPlayButton(false)}
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/90 flex items-center justify-center transform hover:scale-110 transition-transform duration-200 shadow-2xl">
                <Play className="w-8 h-8 sm:w-10 sm:h-10 text-primary-foreground ml-1" />
              </div>
            </div>
          )}

          {/* Drive iframe */}
          <iframe
            src={embedUrl}
            className="w-full h-full"
            allow="autoplay; fullscreen"
            allowFullScreen
            style={{ border: "none" }}
          />
        </div>
      </div>
    </div>
  )
}