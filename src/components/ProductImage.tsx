"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * Renders a product image with a warm-gray fallback.
 * className controls all sizing/layout — pass aspect ratio and dimensions there.
 */
export default function ProductImage({
  src,
  alt,
  className = "",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <div
        className={className}
        style={{ background: "#c4b5a0" }}
        aria-label={alt}
      />
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        unoptimized
        className="object-cover"
        onError={() => setError(true)}
      />
    </div>
  );
}
