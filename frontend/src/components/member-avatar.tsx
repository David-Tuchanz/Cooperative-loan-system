
"use client";

import { useEffect, useState } from "react";

type MemberAvatarProps = {
  imageUrl?: string | null;
  name?: string;
  sizeClassName?: string;
  className?: string;
};

export function MemberAvatar({
  imageUrl,
  name = "Member",
  sizeClassName = "h-10 w-10",
  className = "",
}: MemberAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [imageUrl]);

  const initials = name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#0b2545] to-teal-600 text-sm font-semibold text-white ${sizeClassName} ${className}`}
    >
      {imageUrl && !imageFailed ? (
        <img
          src={imageUrl}
          alt={`${name}'s profile`}
          className="h-full w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        initials || "M"
      )}
    </span>
  );
}
