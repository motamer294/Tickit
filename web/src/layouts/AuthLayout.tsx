import { Box, Group, Text, Container, Stack } from "@mantine/core";
import { Outlet, useNavigate } from "react-router-dom";
import ThemeToggle from "@/components/ThemeToggle";
import logoSvg from "@/assets/logo.svg";

const B = {
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
      {/* Header */}
      <Container size="xl" w="100%" h={60} display="flex" style={{ alignItems: "center" }}>
        <Group justify="space-between" w="100%">
          <Box style={{ cursor: "pointer" }} onClick={() => navigate("/login")}>
            <img src={logoSvg} alt="Tickit" style={{ height: 28, width: "auto", display: "block" }} />
          </Box>
          <ThemeToggle />
        </Group>
      </Container>

      {/* Content */}
      <Stack flex={1} justify="center" align="center" px="md" py={32}>
        <Box style={{ width: "100%" }}>
          <Outlet />
        </Box>

        <Group gap="lg" mt={32} style={{ opacity: 0.45 }}>
          {["Security", "Privacy", "System Status"].map((link) => (
            <Text key={link} size="xs" fw={500} style={{ cursor: "pointer", letterSpacing: "0.04em" }}>
              {link}
            </Text>
          ))}
        </Group>
      </Stack>
    </Box>
  );
};

export default AuthLayout;
