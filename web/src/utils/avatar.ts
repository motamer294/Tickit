/**
 * Shared avatar helpers — deterministic color palette + initials,
 * used by <UserAvatar> and anywhere a user's photo/initials are shown.
 */

export const AVATAR_PALETTES = [
  { bg: "#EEEDFE", color: "#3C3489" },
  { bg: "#E1F5EE", color: "#085041" },
  { bg: "#FAEEDA", color: "#633806" },
  { bg: "#FAECE7", color: "#712B13" },
  { bg: "#E6F1FB", color: "#0C447C" },
  { bg: "#FBEAF0", color: "#72243E" },
];

export function getAvatarPalette(seed: string) {
  const idx = (seed || "?")
    .split("")
    .reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_PALETTES[idx % AVATAR_PALETTES.length];
}

/** Initials from a single display name / username (e.g. "John Doe" or "j.doe") */
export function getInitials(name = "") {
  return (
    name
      .trim()
      .split(/[\s._-]+/)
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?"
  );
}

/** Initials from separate first/last name fields, falling back to a seed string */
export function getInitialsFromNames(
  firstName?: string | null,
  lastName?: string | null,
  fallback = "",
) {
  const first = firstName ?? "";
  const last = lastName ?? "";
  const initials = `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
  return initials || getInitials(fallback);
}
