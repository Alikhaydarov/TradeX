"use client";

import { createTheme, ThemeProvider } from "@mui/material/styles";
import type { ReactNode } from "react";

const theme = createTheme({
  cssVariables: true,
  palette: {
    mode: "dark",
    background: { default: "#000000", paper: "#070707" },
    primary: { main: "#ffffff", contrastText: "#000000" },
    text: { primary: "#ffffff", secondary: "#a1a1aa" },
    divider: "rgba(255,255,255,0.08)",
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: "var(--font-inter), Inter, ui-sans-serif, system-ui, sans-serif",
    button: { textTransform: "none", fontWeight: 700 },
  },
  components: {
    MuiDialog: { styleOverrides: { paper: { backgroundImage: "none" } } },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 44,
          justifyContent: "flex-start",
          borderRadius: 12,
          color: "#a1a1aa",
          "&.Mui-selected": { color: "#ffffff", background: "rgba(255,255,255,0.08)" },
        },
      },
    },
    MuiTabs: { styleOverrides: { indicator: { display: "none" } } },
    MuiSwitch: {
      styleOverrides: {
        switchBase: { "&.Mui-checked": { color: "#ffffff" }, "&.Mui-checked + .MuiSwitch-track": { backgroundColor: "#ffffff" } },
        track: { backgroundColor: "#52525b" },
      },
    },
  },
});

export function MaterialProvider({ children }: { children: ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
