/**
 * Button stories — design system v2
 */
import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { Button } from "./components.js";

const meta: Meta<typeof Button> = {
  title:     "Design System/Button",
  component: Button,
  tags:      ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Primary action element. 7 variants × 8 sizes. WCAG 2.2 AAA focus ring. Supports loading state, left/right icon slots.",
      },
    },
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["brand","outline","ghost","destructive","success","warning","link"],
    },
    size: {
      control: "select",
      options: ["2xs","xs","sm","md","lg","xl","2xl","icon"],
    },
    loading: { control: "boolean" },
    disabled: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Brand: Story     = { args: { children: "Start Assessment", variant: "primary", size: "md" } };
export const Outline: Story   = { args: { children: "View Report",       variant: "outline" } };
export const Ghost: Story     = { args: { children: "Cancel",            variant: "ghost" } };
export const Destructive: Story = { args: { children: "Delete Account",  variant: "danger" } };
export const Success: Story   = { args: { children: "Submit Answer",     variant: "success" } };
export const Warning: Story   = { args: { children: "Flag for Review",   variant: "secondary" } };
export const Loading: Story   = { args: { children: "Submitting…",       variant: "primary", loading: true } };
export const Disabled: Story  = { args: { children: "Unavailable",       variant: "primary", disabled: true } };

export const AllSizes: Story  = {
  render: () => (
    React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" } },
      ...["2xs","xs","sm","md","lg","xl","2xl"].map((size) =>
        React.createElement(Button, { key: size, variant: "primary", size: size as any }, size)
      )
    )
  ),
};

export const AllVariants: Story = {
  render: () => (
    React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 10 } },
      ...["brand","outline","ghost","destructive","success","warning","link"].map((v) =>
        React.createElement(Button, { key: v, variant: v as any }, v)
      )
    )
  ),
};
