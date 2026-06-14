import type { TicketStatus } from "@/types/ticket";

export const B = {
  purple: "#7F77DD",
  purpleDark: "#534AB7",
  purpleDeep: "#3C3489",
  purpleLight: "#EEEDFE",
  purpleMid: "#AFA9EC",
  red: "#E24B4A",
  redLight: "#FCEBEB",
  redText: "#791F1F",
  amber: "#EF9F27",
  amberLight: "#FAEEDA",
  amberText: "#633806",
  green: "#639922",
  greenLight: "#EAF3DE",
  greenText: "#27500A",
  gray: "#B4B2A9",
  grayLight: "#F1EFE8",
  grayText: "#444441",
  blue: "#378ADD",
  blueLight: "#E6F1FB",
  blueText: "#0C447C",
};

export const AVATAR_PALETTES = [
  { bg: "#EEEDFE", color: "#3C3489" },
  { bg: "#E1F5EE", color: "#085041" },
  { bg: "#FAEEDA", color: "#633806" },
  { bg: "#FAECE7", color: "#712B13" },
  { bg: "#E6F1FB", color: "#0C447C" },
  { bg: "#FBEAF0", color: "#72243E" },
];

export const STATUS_META: Record<
  TicketStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  OPEN: { label: "Open", bg: B.redLight, text: B.redText, dot: B.red },
  PENDING: { label: "Pending", bg: B.blueLight, text: B.blueText, dot: B.blue },
  IN_PROGRESS: { label: "In Progress", bg: B.amberLight, text: B.amberText, dot: B.amber },
  RESOLVED: { label: "Resolved", bg: B.greenLight, text: B.greenText, dot: B.green },
  CLOSED: { label: "Closed", bg: B.grayLight, text: B.grayText, dot: B.gray },
};

export const PRIORITY_META: Record<string, { bg: string; text: string; dot: string }> = {
  LOW: { bg: B.greenLight, text: B.greenText, dot: B.green },
  MEDIUM: { bg: B.amberLight, text: B.amberText, dot: B.amber },
  HIGH: { bg: B.redLight, text: B.redText, dot: B.red },
  URGENT: { bg: B.redLight, text: B.redText, dot: B.red },
};

export const SENTIMENT_META: Record<
  string,
  { bg: string; text: string; dot: string; icon: string }
> = {
  Positive: { bg: B.greenLight, text: B.greenText, dot: B.green, icon: "solar:smile-circle-bold-duotone" },
  Neutral: { bg: B.blueLight, text: B.blueText, dot: B.blue, icon: "solar:face-id-bold-duotone" },
  Negative: { bg: B.redLight, text: B.redText, dot: B.red, icon: "solar:sad-circle-bold-duotone" },
};

export function getInitials(name = "") {
  return (
    name
      .split(/[\s._-]/)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?"
  );
}

export function getAvatarPal(name = "") {
  const idx = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_PALETTES[idx % AVATAR_PALETTES.length];
}

export function formatFileSize(bytes: number) {
  if (!bytes) return "0 B";
  const k = 1024,
    s = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / k ** i).toFixed(1) + " " + s[i];
}

export function fileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext))
    return "solar:gallery-bold-duotone";
  if (ext === "pdf") return "solar:file-pdf-bold-duotone";
  if (["doc", "docx"].includes(ext)) return "solar:file-text-bold-duotone";
  return "solar:file-bold-duotone";
}
