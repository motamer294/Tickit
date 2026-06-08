import { Box, Group, Text, Container, Stack } from "@mantine/core";
import { Outlet, useNavigate } from "react-router-dom";
import { Icon } from "@iconify-icon/react";
import ThemeToggle from "@/components/ThemeToggle";

const B = {
  purple: "#7F77DD",
  purpleDark: "#534AB7",
  purpleLight: "#EEEDFE",
};

const AuthLayout = () => {
  const navigate = useNavigate();

  return (
    <Box
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: `
          radial-gradient(ellipse at 10% 0%,   ${B.purpleLight}CC 0%, transparent 40%),
          radial-gradient(ellipse at 90% 100%, ${B.purpleLight}88 0%, transparent 40%),
          var(--mantine-color-body)
        `,
      }}
    >
      {/* ── Header ── */}
      <Container
        size="xl"
        w="100%"
        h={60}
        display="flex"
        style={{ alignItems: "center" }}
      >
        <Group justify="space-between" w="100%">
          {/* Logo */}
          <Group
            gap={9}
            style={{ cursor: "pointer" }}
            onClick={() => navigate("/login")}
          >
            <Box
              style={{
                width: 30,
                height: 30,
                borderRadius: 9,
                background: B.purpleDark,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon
                icon="solar:ticket-bold-duotone"
                width={16}
                style={{ color: "#fff" }}
              />
            </Box>
            <Text
              fw={700}
              size="sm"
              style={{
                letterSpacing: "0.12em",
                color: B.purpleDark,
                textTransform: "uppercase",
              }}
            >
              TicketMe
            </Text>
          </Group>

          <ThemeToggle />
        </Group>
      </Container>

      {/* ── Content ── */}
      <Stack flex={1} justify="center" align="center" px="md" py={32}>
        <Box
          style={{
            width: "100%",
            animation: "auth-reveal 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <Outlet />
        </Box>

        {/* Footer */}
        <Group gap="lg" mt={32} style={{ opacity: 0.45 }}>
          {["Security", "Privacy", "System Status"].map((link) => (
            <Text
              key={link}
              size="xs"
              fw={500}
              style={{ cursor: "pointer", letterSpacing: "0.04em" }}
            >
              {link}
            </Text>
          ))}
        </Group>
      </Stack>

      <style>{`
        @keyframes auth-reveal {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
      `}</style>
    </Box>
  );
};

export default AuthLayout;
