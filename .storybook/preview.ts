import type { Preview, Decorator } from "@storybook/react";
import React from "react";
import "../src/index.css";

// ── ThemeProvider decorator ─────────────────────────────────────────────────

const withTheme: Decorator = (Story, context) => {
  const theme = context.globals.theme ?? "light";
  const dir   = context.globals.dir ?? "ltr";

  React.useEffect(() => {
    const html = document.documentElement;
    html.setAttribute("data-theme", theme);
    html.setAttribute("dir", dir);
    if (theme === "dark") html.classList.add("dark");
    else html.classList.remove("dark");
  }, [theme, dir]);

  return React.createElement(
    "div",
    {
      style: {
        padding: 24,
        background: "var(--bg-app)",
        minHeight: "100vh",
        color: "var(--text-primary)",
        fontFamily: "var(--font-sans)",
        transition: "background 0.2s, color 0.2s",
      },
      dir,
    },
    React.createElement(Story)
  );
};

const preview: Preview = {
  decorators: [withTheme],

  globalTypes: {
    theme: {
      description: "Global colour scheme",
      defaultValue: "light",
      toolbar: {
        title: "Theme",
        icon: "circlehollow",
        items: [
          { value: "light", icon: "sun",  title: "Light" },
          { value: "dark",  icon: "moon", title: "Dark" },
        ],
        dynamicTitle: true,
      },
    },
    dir: {
      description: "Text direction",
      defaultValue: "ltr",
      toolbar: {
        title: "Direction",
        icon: "paragraph",
        items: [
          { value: "ltr", title: "LTR (left-to-right)" },
          { value: "rtl", title: "RTL (right-to-left)" },
        ],
        dynamicTitle: true,
      },
    },
  },

  parameters: {
    layout: "fullscreen",
    backgrounds: { disable: true }, // using CSS vars instead
    controls: {
      matchers: {
        color: /(background|color|fill|stroke)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      config: {
        rules: [
          // Enforce WCAG AAA colour contrast
          { id: "color-contrast-enhanced", enabled: true },
        ],
      },
    },
    docs: {
      story: { inline: true },
    },
  },
};

export default preview;
