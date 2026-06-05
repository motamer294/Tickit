import { Component } from "react";
import type { ReactNode } from "react";
import { Container, Stack, Button, Box, Text, Paper } from "@mantine/core";
import { Icon } from "@iconify-icon/react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

const B = {
  purple: "#7F77DD",
  purpleDark: "#534AB7",
  purpleLight: "#EEEDFE",
  purpleText: "#3C3489",
  red: "#E24B4A",
  redLight: "#FCEBEB",
};

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("🚨 Error Boundary caught:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/app";
  };

  render() {
    if (this.state.hasError) {
      return (
        <Container size="md" py={60}>
          <Stack gap={24}>
            <Box>
              <Box
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <Box
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    background: B.redLight,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon
                    icon="solar:warning-circle-bold-duotone"
                    width={20}
                    style={{ color: B.red }}
                  />
                </Box>
                <div>
                  <Text fw={600} size="lg">
                    Oops! Something went wrong
                  </Text>
                  <Text size="sm" c="dimmed">
                    We encountered an unexpected error
                  </Text>
                </div>
              </Box>
            </Box>

            <Paper
              p={16}
              radius={12}
              style={{
                background: "var(--mantine-color-default-hover)",
                border: "0.5px solid var(--mantine-color-default-border)",
              }}
            >
              <details style={{ cursor: "pointer" }}>
                <summary
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--mantine-color-text)",
                    userSelect: "none",
                  }}
                >
                  Error details (for developers)
                </summary>
                <pre
                  style={{
                    marginTop: 12,
                    fontSize: 11,
                    overflow: "auto",
                    color: "var(--mantine-color-text-secondary)",
                    lineHeight: 1.5,
                  }}
                >
                  {this.state.error?.toString()}
                  {"\n\n"}
                  {this.state.error?.stack}
                </pre>
              </details>
            </Paper>

            <Button
              onClick={this.handleReset}
              leftSection={<Icon icon="solar:home-bold-duotone" width={16} />}
              size="md"
              radius="md"
              style={{
                background: B.purpleDark,
              }}
              styles={{
                root: {
                  "&:hover": { background: B.purple },
                },
              }}
            >
              Return to Dashboard
            </Button>
          </Stack>
        </Container>
      );
    }

    return this.props.children;
  }
}
