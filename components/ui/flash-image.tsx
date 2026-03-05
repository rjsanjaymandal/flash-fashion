"use client"

import Image, { ImageProps } from "next/image"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

interface FlashImageProps extends Omit<ImageProps, "src"> {
  src: string | null | undefined
  fallbackSrc?: string
  aspectRatio?: "square" | "video" | "portrait" | "landscape" | "auto"
  showSkeleton?: boolean
  className?: string
  containerClassName?: string
  resizeMode?: "cover" | "contain" | "fill"
}

export default function FlashImage({
  src,
  fallbackSrc = "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&fit=crop&q=80&w=1000",
  alt,
  aspectRatio = "auto",
  showSkeleton = true,
  className,
  containerClassName,
  resizeMode = "cover",
  ...props
}: FlashImageProps) {
  const [imgSrc, setImgSrc] = useState<string>(src || fallbackSrc)
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    if (src) {
      setImgSrc(src)
      setIsError(false)
      setIsLoading(true)
    } else {
      setImgSrc(fallbackSrc)
    }
  }, [src, fallbackSrc])

  const aspectRatios = {
    square: "aspect-square",
    video: "aspect-video",
    portrait: "aspect-[3/4]",
    landscape: "aspect-[4/3]",
    auto: "",
  }

  const resizeModes = {
    cover: "object-cover",
    contain: "object-contain",
    fill: "object-fill",
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-secondary/20",
        props.fill ? "h-full w-full" : "",
        aspectRatios[aspectRatio],
        containerClassName
      )}
    >
      {showSkeleton && isLoading && (
        <div className="absolute inset-0 z-10">
          <div className="w-full h-full bg-linear-to-r from-transparent via-white/5 to-transparent skeleton-shine animate-pulse" />
        </div>
      )}

      <Image
        src={imgSrc}
        alt={alt || "Flash Fashion Image"}
        className={cn(
          "transition-all duration-700 ease-in-out",
          resizeModes[resizeMode],
          isLoading ? "scale-105 blur-lg grayscale opacity-0" : "scale-100 blur-0 grayscale-0 opacity-100",
          isError ? "opacity-0" : "",
          className
        )}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsError(true)
          setImgSrc(fallbackSrc)
          setIsLoading(false)
        }}
        {...props}
      />

      {isError && (
        <div className="absolute inset-0 flex items-center justify-center bg-secondary/40 backdrop-blur-sm">
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] opacity-30">
            Image Offline
          </span>
        </div>
      )}
    </div>
  )
}
