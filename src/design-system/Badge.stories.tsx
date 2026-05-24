/**
 * Badge stories — design system v2
 */
import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { Badge } from "./components.js";

const meta: Meta<typeof Badge> = {
  title:     "Design System/Badge",
  component: Badge,
  tags:      ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default","brand","success","warning","error","info","outline"],
    },
    dot: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = { args: { children: "Default" } };
export const Brand: Story   = { args: { children: "Brand",   variant: "brand" } };
export const Success: Story = { args: { children: "Passed",  variant: "success" } };
export const Warning: Story = { args: { children: "Review",  variant: "warning" } };
export const Error: Story   = { args: { children: "Failed",  variant: "error" } };

export const WithDot: Story = {
  render: () => (
    React.createElement("div", { style: { display: "flex", gap: 8 } },
      React.createElement(Badge, { variant: "success", dot: true }, "Online"),
      React.createElement(Badge, { variant: "error",   dot: true }, "Offline"),
      React.createElement(Badge, { variant: "warning", dot: true }, "Away"),
    )
  ),
};

export const CefrLevels: Story = {
  render: () => (
    React.createElement("div", { style: { display: "flex", gap: 8 } },
      ...["A1","A2","B1","B2","C1","C2"].map((band) =>
        React.createElement(Badge, { key: band, variant: "brand" }, band)
      )
    )
  ),
};
