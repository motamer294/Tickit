import { Box, Text } from "@mantine/core";
import { Icon } from "@iconify-icon/react";

// ─── Brand / variant config ────────────────────────────────────────────────────

const VARIANT_CONFIG = {
  success: {
    icon: "solar:check-circle-bold-duotone",
    borderColor: "#639922",
    iconBg: "#EAF3DE",
    iconColor: "#639922",
    titleColor: "#27500A",
    msgColor: "#3B6D11",
    progressBg: "#639922",
  },
  error: {
    icon: "solar:close-circle-bold-duotone",
    borderColor: "#E24B4A",
    iconBg: "#FCEBEB",
    iconColor: "#E24B4A",
    titleColor: "#791F1F",
    msgColor: "#A32D2D",
    progressBg: "#E24B4A",
  },
  warning: {
    icon: "solar:danger-triangle-bold-duotone",
    borderColor: "#EF9F27",
    iconBg: "#FAEEDA",
    iconColor: "#EF9F27",
    titleColor: "#633806",
    msgColor: "#854F0B",
    progressBg: "#EF9F27",
  },
  info: {
    icon: "solar:info-circle-bold-duotone",
    borderColor: "#7F77DD",
    iconBg: "#EEEDFE",
    iconColor: "#7F77DD",
    titleColor: "#3C3489",
    msgColor: "#534AB7",
    progressBg: "#7F77DD",
  },
};

export type AlertVariant = keyof typeof VARIANT_CONFIG;

interface CustomAlertProps {
  title: string;
  children?: React.ReactNode;
  variant?: AlertVariant;
  style?: React.CSSProperties;
  /** Duration in ms for the progress bar animation. 0 = no bar */
  duration?: number;
  onDismiss?: () => void;
}

export function CustomAlert({
  title,
  children,
  variant = "info",
  style,
  duration = 4000,
  onDismiss,
}: CustomAlertProps) {
  const c = VARIANT_CONFIG[variant];

  return (
    <Box
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "14px 16px",
        borderRadius: 12,
        borderLeft: `3px solid ${c.borderColor}`,
        borderTop: "0.5px solid var(--mantine-color-default-border)",
        borderRight: "0.5px solid var(--mantine-color-default-border)",
        borderBottom: "0.5px solid var(--mantine-color-default-border)",
        background: "var(--mantine-color-body)",
        position: "relative",
        overflow: "hidden",
        ...style,
      }}
    >
      {/* Icon */}
      <Box
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          background: c.iconBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        <Icon icon={c.icon} width={16} style={{ color: c.iconColor }} />
      </Box>

      {/* Body */}
      <Box style={{ flex: 1, minWidth: 0 }}>
        <Text
          size="sm"
          fw={500}
          style={{
            color: c.titleColor,
            lineHeight: 1.3,
            marginBottom: children ? 3 : 0,
          }}
        >
          {title}
        </Text>
        {children && (
          <Text size="xs" style={{ color: c.msgColor, lineHeight: 1.45 }}>
            {children}
          </Text>
        )}
      </Box>

      {/* Dismiss button */}
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          style={{
            width: 20,
            height: 20,
            borderRadius: 4,
            border: "none",
            background: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--mantine-color-dimmed)",
            flexShrink: 0,
            marginTop: 1,
            padding: 0,
          }}
        >
          <Icon icon="solar:close-circle-linear" width={14} />
        </button>
      )}

      {/* Progress bar */}
      {duration > 0 && (
        <Box
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            height: 2,
            background: c.progressBg,
            animation: `toast-progress ${duration}ms linear forwards`,
          }}
        />
      )}
    </Box>
  );
}
