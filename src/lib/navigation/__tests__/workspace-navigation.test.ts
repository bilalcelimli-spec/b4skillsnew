import { describe, expect, it } from "vitest";
import { getWorkspaceNavigation } from "../workspace-navigation.js";

const labelsFor = (role: string) => getWorkspaceNavigation(role).map((item) => item.label);

describe("workspace navigation", () => {
  it("shows candidate navigation without privileged entries", () => {
    expect(labelsFor("CANDIDATE")).toEqual(["Dashboard", "My Results", "Profile"]);
  });

  it("shows teacher classes on every viewport", () => {
    expect(labelsFor("TEACHER")).toEqual(["Dashboard", "My Classes", "My Results", "Profile"]);
  });

  it.each([
    "ITEM_WRITER",
    "LANGUAGE_REVIEWER",
    "CEFR_REVIEWER",
    "FAIRNESS_REVIEWER",
    "MODERATOR",
    "PSYCHOMETRICIAN",
  ])(
    "shows the review queue for %s",
    (role) => expect(labelsFor(role)).toContain("Review Queue"),
  );

  it("shows the complete admin workspace without duplicate entries", () => {
    const labels = labelsFor("SUPER_ADMIN");
    expect(labels).toEqual([
      "Dashboard",
      "Admin Console",
      "Rating Queue",
      "Institutional",
      "My Results",
      "Profile",
    ]);
    expect(new Set(labels).size).toBe(labels.length);
  });
});
