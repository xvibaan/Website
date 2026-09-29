"use client";

import React from "react";
import { Video, Film, PlayCircle, Clock } from "lucide-react";

interface TutorialVideoPlayerProps {
  videoUrl?: string | null;
  title?: string | null;
  description?: string | null;
  productTitle?: string;
}

function getYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  
  // If already an embed URL
  if (url.includes("/embed/")) {
    return url;
  }

  // Handle standard youtube.com/watch?v=ID or youtu.be/ID
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);

  if (match && match[2].length === 11) {
    return `https://www.youtube-nocookie.com/embed/${match[2]}`;
  }

  return null;
}

function isDirectVideoUrl(url: string): boolean {
  if (!url) return false;
  return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url);
}

export default function TutorialVideoPlayer({
  videoUrl,
  title,
  description,
  productTitle,
}: TutorialVideoPlayerProps) {
  const cleanUrl = videoUrl?.trim();
  const embedUrl = cleanUrl ? getYouTubeEmbedUrl(cleanUrl) : null;
  const isDirect = cleanUrl ? isDirectVideoUrl(cleanUrl) : false;

  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-5 sm:p-6 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Video className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">
              {title || "Tutorial — How to Use This Code"}
            </h3>
            <span className="text-[11px] font-mono text-gray-400">
              Redemption Walkthrough
            </span>
          </div>
        </div>

        {cleanUrl && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-mono font-semibold">
            <PlayCircle className="w-3 h-3 mr-1" />
            HD Walkthrough
          </span>
        )}
      </div>

      {description && (
        <p className="text-xs text-gray-300 mb-4 leading-relaxed">
          {description}
        </p>
      )}

      {cleanUrl ? (
        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black/60 border border-white/10 shadow-2xl">
          {embedUrl ? (
            <iframe
              src={embedUrl}
              title={title || `${productTitle || "Product"} Tutorial Video`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full border-0"
            />
          ) : isDirect ? (
            <video
              src={cleanUrl}
              controls
              playsInline
              preload="metadata"
              className="w-full h-full object-contain"
            >
              Your browser does not support the video tag.
            </video>
          ) : (
            <iframe
              src={cleanUrl}
              title={title || `${productTitle || "Product"} Tutorial Video`}
              sandbox="allow-scripts allow-same-origin allow-presentation"
              allowFullScreen
              className="w-full h-full border-0"
            />
          )}
        </div>
      ) : (
        /* Safe Coming Soon placeholder */
        <div className="relative w-full py-10 px-6 rounded-xl bg-white/[0.02] border border-dashed border-white/10 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 mb-3">
            <Film className="w-6 h-6 opacity-60" />
          </div>
          <h4 className="text-sm font-semibold text-gray-200 mb-1">
            Tutorial video coming soon.
          </h4>
          <p className="text-xs text-gray-400 max-w-md leading-relaxed">
            A step-by-step video guide for this redeem code is currently in production. Please refer to the How to Use instructions above for redemption steps.
          </p>
          <div className="mt-3 inline-flex items-center text-[11px] font-mono text-gray-500 gap-1.5">
            <Clock className="w-3.5 h-3.5 text-primary/70" />
            <span>Updated with every official vendor release</span>
          </div>
        </div>
      )}
    </div>
  );
}
