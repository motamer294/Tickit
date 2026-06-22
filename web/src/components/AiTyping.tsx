import { useState, useEffect } from "react";
import { Text, Group } from "@mantine/core";
import { B } from "@/utils/ticketUtils";

export function dedupeAiSolution(text: string): string {
  const parts = text
    .split(" | ")
    .map((p) => p.trim())
    .filter(Boolean);
  return [...new Set(parts)].join(" ");
}

export function ThinkingDots() {
  return (
    <Group gap={6} align="center">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="thinking-dot"
          style={{
            display: "inline-block",
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: B.purple,
            animationDelay: `${i * 0.18}s`,
          }}
        />
      ))}
    </Group>
  );
}

export function TypedText({
  text,
  delay = 0,
  size = "sm",
  color = "#534ab7",
}: {
  text: string;
  delay?: number;
  size?: string;
  color?: string;
}) {
  const [started, setStarted] = useState(delay === 0);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (delay === 0) return;
    const t = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  useEffect(() => {
    if (!started || index >= text.length) return;
    const t = setTimeout(() => setIndex((i) => i + 1), 12 + Math.random() * 12);
    return () => clearTimeout(t);
  }, [started, index, text]);

  if (!started) return null;

  const done = index >= text.length;

  return (
    <Text size={size as any} style={{ lineHeight: 1.7, color }}>
      {text.slice(0, index)}
      {!done && (
        <span
          className="ai-cursor"
          style={{
            display: "inline-block",
            width: 2,
            height: 13,
            background: B.purple,
            marginLeft: 1,
            borderRadius: 1,
            verticalAlign: "middle",
          }}
        />
      )}
    </Text>
  );
}
