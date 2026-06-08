import {
  MantineProvider as BaseProvider,
  createTheme,
  ColorSchemeScript,
} from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { useThemeStore } from "@/store/theme.store";
import { CustomToastContainer } from "@/components/CustomToastContainer";

// Ensure CSS imports are present
import "@mantine/core/styles.css";

interface Props {
  children: React.ReactNode;
}

const theme = createTheme({
  primaryColor: "blue",
  fontFamily: "Outfit, sans-serif",
});

export function MantineProvider({ children }: Props) {
  const mode = useThemeStore((s) => s.mode);

  return (
    <>
      <ColorSchemeScript defaultColorScheme="auto" />
      <BaseProvider
        theme={theme}
        forceColorScheme={mode}
        defaultColorScheme="light"
      >
        <CustomToastContainer />
        <ModalsProvider>{children}</ModalsProvider>
      </BaseProvider>
    </>
  );
}
