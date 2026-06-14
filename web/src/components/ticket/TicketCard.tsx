import React from "react";
import { Text, Box } from "@mantine/core";
import { Group } from "@mantine/core";

export function Pill({
  label,
  bg,
  text,
  dot,
}: {
  label: string;
  bg: string;
  text: string;
  dot: string;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: 11,
        fontWeight: 500,
        padding: "4px 10px",
        borderRadius: 20,
        background: bg,
        color: text,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: dot,
          flexShrink: 0,
        }}
      />
      {label}
    </span>
  );
}

export function SLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text
      size="xs"
      tt="uppercase"
      fw={500}
      c="dimmed"
      style={{ letterSpacing: "0.06em" }}
    >
      {children}
    </Text>
  );
}

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <Box
      style={{
        background: "var(--mantine-color-body)",
        border: "0.5px solid var(--mantine-color-default-border)",
        borderRadius: 12,
        overflow: "hidden",
        ...style,
      }}
    >
      {children}
    </Box>
  );
}

export function CardHeader({
  left,
  right,
}: {
  left: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <Box
      px="md"
      py="sm"
      style={{
        borderBottom: "0.5px solid var(--mantine-color-default-border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Group gap={8}>{left}</Group>
      {right && <Box>{right}</Box>}
    </Box>
  );
}
