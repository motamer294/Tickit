import { Avatar, type AvatarProps } from "@mantine/core";
import { useAvatarUrl } from "@/hooks/useAvatarUrl";
import {
  getAvatarPalette,
  getInitials,
  getInitialsFromNames,
} from "@/utils/avatar";

interface UserAvatarProps extends Omit<AvatarProps, "src" | "children"> {
  /** User id — needed to fetch the uploaded photo. Omit to always show initials. */
  userId?: number | null;
  firstName?: string | null;
  lastName?: string | null;
  /** Fallback seed for initials/color when first/last name aren't available (e.g. username) */
  name?: string | null;
}

/**
 * Renders a user's uploaded profile picture when available, falling back to
 * their initials on a deterministic color. Drop-in replacement for the
 * Avatar-with-initials pattern used throughout the app.
 */
export default function UserAvatar({
  userId,
  firstName,
  lastName,
  name,
  style,
  ...avatarProps
}: UserAvatarProps) {
  const avatarUrl = useAvatarUrl(userId);
  const seed = name || `${firstName ?? ""} ${lastName ?? ""}`.trim();
  const pal = getAvatarPalette(seed);
  const initials =
    firstName || lastName
      ? getInitialsFromNames(firstName, lastName, seed)
      : getInitials(seed);

  return (
    <Avatar
      src={avatarUrl}
      style={{ background: pal.bg, color: pal.color, fontWeight: 600, ...style }}
      {...avatarProps}
    >
      {initials}
    </Avatar>
  );
}
