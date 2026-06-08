import { ActionIcon, Menu } from "@mantine/core";
import { Icon } from "@iconify-icon/react";
import { useThemeStore } from "@/store/theme.store";

const B = {
  purple: "#7F77DD",
  purpleDark: "#534AB7",
  purpleLight: "#EEEDFE",
  purpleText: "#534AB7",
};

export default function ThemeToggle() {
  const { mode, setMode } = useThemeStore();

  const modeIcons = {
    light: "solar:sun-2-bold-duotone",
    dark: "solar:moon-bold-duotone",
  };

  return (
    <Menu
      shadow="none"
      width={160}
      radius={12}
      transitionProps={{ transition: "pop-top-right", duration: 150 }}
      withinPortal
      offset={{ mainAxis: 8, crossAxis: 0 }}
    >
      <Menu.Target>
        <ActionIcon
          variant="default"
          size={36}
          radius="md"
          aria-label="Toggle theme"
          style={{
            border: "0.5px solid var(--mantine-color-default-border)",
            transition: "all 0.15s ease",
            background: "var(--mantine-color-body)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background =
              "var(--mantine-color-default-hover)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--mantine-color-body)";
          }}
        >
          <Icon
            icon={modeIcons[mode as keyof typeof modeIcons]}
            width={18}
            style={{ color: B.purpleText }}
          />
        </ActionIcon>
      </Menu.Target>

      <Menu.Dropdown
        p={4}
        style={{
          border: "0.5px solid var(--mantine-color-default-border)",
          background: "var(--mantine-color-body)",
        }}
      >
        <Menu.Label
          style={{
            padding: "8px 12px",
            fontSize: 11,
            fontWeight: 600,
            color: "var(--mantine-color-text-secondary)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Appearance
        </Menu.Label>

        {(["light", "dark"] as const).map((item) => (
          <Menu.Item
            key={item}
            onClick={() => setMode(item)}
            leftSection={
              <Icon
                icon={modeIcons[item]}
                width={16}
                style={{
                  color:
                    mode === item
                      ? B.purpleText
                      : "var(--mantine-color-dimmed)",
                }}
              />
            }
            rightSection={
              mode === item && (
                <Icon
                  icon="solar:check-read-linear"
                  width={14}
                  style={{ color: B.purple }}
                />
              )
            }
            style={{
              padding: "8px 12px",
              fontSize: 13,
              fontWeight: mode === item ? 500 : 400,
              borderRadius: 8,
              color: mode === item ? B.purpleText : "var(--mantine-color-text)",
              background: mode === item ? B.purpleLight : "transparent",
              transition: "all 0.13s ease",
            }}
          >
            {item.charAt(0).toUpperCase() + item.slice(1)}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
