import { Stack, Group, Text, Box, Button } from "@mantine/core";
import { Icon } from "@iconify-icon/react";
import { notifications } from "@mantine/notifications";

const B = {
  purple: "#7F77DD",
  purpleDark: "#534AB7",
  purpleLight: "#EEEDFE",
  purpleDeep: "#3C3489",
  green: "#639922",
  greenLight: "#EAF3DE",
  greenText: "#27500A",
  amber: "#EF9F27",
  amberLight: "#FAEEDA",
  amberText: "#633806",
  red: "#E24B4A",
  redLight: "#FCEBEB",
  redText: "#791F1F",
  gray: "#B4B2A9",
  grayLight: "#F1EFE8",
  grayText: "#444441",
  blue: "#378ADD",
  blueLight: "#E6F1FB",
  blueText: "#0C447C",
};

function SLabel({ children }: { children: React.ReactNode }) {
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

function SettingsCard({
  icon,
  label,
  description,
  children,
}: {
  icon: string;
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Box
      style={{
        background: "var(--mantine-color-body)",
        border: "0.5px solid var(--mantine-color-default-border)",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <Box
        px="lg"
        py="sm"
        style={{
          borderBottom: "0.5px solid var(--mantine-color-default-border)",
        }}
      >
        <Group gap={8}>
          <Icon icon={icon} width={15} style={{ color: B.purple }} />
          <Box>
            <SLabel>{label}</SLabel>
            {description && (
              <Text size="xs" c="dimmed" mt={1}>
                {description}
              </Text>
            )}
          </Box>
        </Group>
      </Box>
      <Box p="lg">{children}</Box>
    </Box>
  );
}

const SYSTEM_STATUS = [
  { service: "API Server", status: "operational", uptime: "99.98%" },
  { service: "Web App", status: "operational", uptime: "99.95%" },
  { service: "Mobile App", status: "degraded", uptime: "97.12%" },
  { service: "Database", status: "operational", uptime: "99.99%" },
  { service: "WebSocket", status: "operational", uptime: "99.91%" },
];

const STATUS_META: Record<
  string,
  { bg: string; text: string; dot: string; label: string }
> = {
  operational: {
    bg: B.greenLight,
    text: B.greenText,
    dot: B.green,
    label: "Operational",
  },
  degraded: {
    bg: B.amberLight,
    text: B.amberText,
    dot: B.amber,
    label: "Degraded",
  },
  outage: { bg: B.redLight, text: B.redText, dot: B.red, label: "Outage" },
};

export default function SupportSettings() {
  const overallOk = SYSTEM_STATUS.every((s) => s.status === "operational");

  return (
    <Stack gap={12}>
      {/* System status */}
      <SettingsCard
        icon="solar:server-minimalistic-bold-duotone"
        label="System status"
        description="Real-time health of all services"
      >
        {/* Overall banner */}
        <Box
          px="md"
          py="sm"
          mb="md"
          style={{
            borderRadius: 8,
            background: overallOk ? B.greenLight : B.amberLight,
            border: `0.5px solid ${overallOk ? B.green : B.amber}44`,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Box
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: overallOk ? B.green : B.amber,
              boxShadow: `0 0 0 2px ${overallOk ? B.greenLight : B.amberLight}`,
            }}
          />
          <Text
            size="sm"
            fw={500}
            style={{ color: overallOk ? B.greenText : B.amberText }}
          >
            {overallOk
              ? "All systems operational"
              : "Some services are degraded"}
          </Text>
        </Box>

        <Stack gap={6}>
          {SYSTEM_STATUS.map((item) => {
            const meta = STATUS_META[item.status] ?? STATUS_META.operational;
            return (
              <Group
                key={item.service}
                justify="space-between"
                align="center"
                px="sm"
                py="sm"
                style={{
                  borderRadius: 8,
                  border: "0.5px solid var(--mantine-color-default-border)",
                  background: "var(--mantine-color-default-hover)",
                }}
              >
                <Group gap={10}>
                  <Box
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: meta.dot,
                      flexShrink: 0,
                    }}
                  />
                  <Text size="sm" fw={500}>
                    {item.service}
                  </Text>
                </Group>
                <Group gap={12}>
                  <Text size="xs" c="dimmed">
                    {item.uptime} uptime
                  </Text>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      padding: "3px 9px",
                      borderRadius: 20,
                      background: meta.bg,
                      color: meta.text,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {meta.label}
                  </span>
                </Group>
              </Group>
            );
          })}
        </Stack>
      </SettingsCard>

      {/* Contact + docs */}
      <SettingsCard
        icon="solar:headphones-round-sound-bold-duotone"
        label="Get help"
        description="Reach our support team or browse the docs"
      >
        <Stack gap={8}>
          {[
            {
              icon: "solar:letter-bold-duotone",
              label: "Email support",
              value: "support@ticketme.com",
              desc: "We typically respond within 4 hours",
              action: "Send email",
              href: "mailto:support@ticketme.com",
              color: B.purple,
            },
            {
              icon: "solar:book-bold-duotone",
              label: "Documentation",
              value: "docs.ticketme.com",
              desc: "Guides, API reference, and tutorials",
              action: "Open docs",
              href: "#",
              color: B.blue,
            },
            {
              icon: "solar:chat-square-bold-duotone",
              label: "Live chat",
              value: "Chat with us",
              desc: "Available Mon–Fri, 9AM–6PM EST",
              action: "Start chat",
              href: "#",
              color: B.green,
            },
          ].map((item) => (
            <Group
              key={item.label}
              justify="space-between"
              align="center"
              px="md"
              py="sm"
              style={{
                borderRadius: 8,
                border: "0.5px solid var(--mantine-color-default-border)",
                background: "var(--mantine-color-default-hover)",
              }}
            >
              <Group gap={12}>
                <Box
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 9,
                    background: B.purpleLight,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon
                    icon={item.icon}
                    width={16}
                    style={{ color: item.color }}
                  />
                </Box>
                <Box>
                  <Text size="sm" fw={500}>
                    {item.label}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {item.desc}
                  </Text>
                </Box>
              </Group>
              <Button
                size="xs"
                variant="default"
                component="a"
                href={item.href}
                target={item.href.startsWith("mailto") ? undefined : "_blank"}
                style={{ flexShrink: 0 }}
              >
                {item.action}
              </Button>
            </Group>
          ))}
        </Stack>
      </SettingsCard>

      {/* App info */}
      <SettingsCard
        icon="solar:info-circle-bold-duotone"
        label="About TicketMe"
        description="Version and build information"
      >
        <Stack gap={6}>
          {[
            { label: "App version", value: "v2.4.1" },
            { label: "Build", value: "#20260515-a3f9" },
            { label: "Environment", value: "Production" },
            { label: "Last updated", value: "May 15, 2026" },
          ].map((row) => (
            <Group
              key={row.label}
              justify="space-between"
              px="sm"
              py={6}
              style={{
                borderRadius: 6,
                background: "var(--mantine-color-default-hover)",
              }}
            >
              <Text size="xs" c="dimmed">
                {row.label}
              </Text>
              <Text size="xs" fw={500} style={{ fontFamily: "monospace" }}>
                {row.value}
              </Text>
            </Group>
          ))}
          <Button
            size="xs"
            variant="subtle"
            leftSection={<Icon icon="solar:refresh-linear" width={12} />}
            style={{ color: B.purpleDark, alignSelf: "flex-end", marginTop: 4 }}
            onClick={() =>
              notifications.show({
                title: "Up to date",
                message: "You are on the latest version",
                color: "green",
              })
            }
          >
            Check for updates
          </Button>
        </Stack>
      </SettingsCard>
    </Stack>
  );
}
