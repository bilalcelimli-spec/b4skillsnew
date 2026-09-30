export type WorkspaceTab =
  | "dashboard"
  | "admin"
  | "rating"
  | "institutional"
  | "teacher"
  | "content"
  | "results"
  | "profile";

export interface WorkspaceCapabilities {
  isAdmin: boolean;
  isRater: boolean;
  isOrgAdmin: boolean;
  isTeacher: boolean;
  isContentWorker: boolean;
}

export interface WorkspaceNavigationItem {
  tab: WorkspaceTab;
  label: string;
}

const CONTENT_ROLES = new Set([
  "ITEM_WRITER",
  "LANGUAGE_REVIEWER",
  "CEFR_REVIEWER",
  "FAIRNESS_REVIEWER",
  "MODERATOR",
  "PSYCHOMETRICIAN",
]);

export function getWorkspaceCapabilities(role?: string | null): WorkspaceCapabilities {
  const normalizedRole = role?.toUpperCase() ?? "";
  const isAdmin = ["SUPER_ADMIN", "ASSESSMENT_DIRECTOR"].includes(normalizedRole);
  const isRater = normalizedRole === "RATER" || isAdmin;
  const isOrgAdmin = ["ORG_ADMIN", "INST_ADMIN"].includes(normalizedRole) || isAdmin;
  const isTeacher = normalizedRole === "TEACHER" || isOrgAdmin;
  const isContentWorker = CONTENT_ROLES.has(normalizedRole) && !isAdmin;

  return { isAdmin, isRater, isOrgAdmin, isTeacher, isContentWorker };
}

export function getWorkspaceNavigation(role?: string | null): WorkspaceNavigationItem[] {
  const capabilities = getWorkspaceCapabilities(role);
  const items: WorkspaceNavigationItem[] = [{ tab: "dashboard", label: "Dashboard" }];

  if (capabilities.isAdmin) items.push({ tab: "admin", label: "Admin Console" });
  if (capabilities.isRater) items.push({ tab: "rating", label: "Rating Queue" });
  if (capabilities.isOrgAdmin) items.push({ tab: "institutional", label: "Institutional" });
  if (capabilities.isTeacher && !capabilities.isOrgAdmin) items.push({ tab: "teacher", label: "My Classes" });
  if (capabilities.isContentWorker) items.push({ tab: "content", label: "Review Queue" });

  items.push(
    { tab: "results", label: "My Results" },
    { tab: "profile", label: "Profile" },
  );
  return items;
}
