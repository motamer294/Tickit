import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { fetchUserAvatarBlob } from "@/api/user.api";

/**
 * Resolves a user's profile picture to a displayable object URL.
 *
 * The avatar endpoint requires a JWT, so it can't be used directly as an
 * <img src> — fetch it as a blob and turn it into an object URL instead.
 * Returns null while loading, missing, or on a 404 (no avatar set), so
 * callers can fall back to initials.
 */
export function useAvatarUrl(userId?: number | null) {
  const { data: blob } = useQuery({
    queryKey: ["userAvatar", userId],
    queryFn: () => fetchUserAvatarBlob(userId as number),
    enabled: !!userId,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const [url, setUrl] = useState<string | null>(null);
  const prevUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (blob) {
      const newUrl = URL.createObjectURL(blob);
      setUrl(newUrl);
      if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
      prevUrlRef.current = newUrl;
    } else {
      if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
      prevUrlRef.current = null;
      setUrl(null);
    }
  }, [blob]);

  // Revoke the last object URL on unmount
  useEffect(() => {
    return () => {
      if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
    };
  }, []);

  return url;
}
