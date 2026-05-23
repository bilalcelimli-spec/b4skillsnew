/**
 * b4skills RBAC (Role-Based Access Control) Manager
 *
 * Supports 7 role types with granular permission sets.
 * Roles: SUPER_ADMIN, INST_ADMIN, DEPT_ADMIN, INSTRUCTOR, ASSESSOR, CANDIDATE, READONLY
 */

// ---------------------------------------------------------------------------
// Role & Permission definitions
// ---------------------------------------------------------------------------

export type PlatformRole =
  | "SUPER_ADMIN"
  | "ASSESSMENT_DIRECTOR"
  | "INST_ADMIN"
  | "DEPT_ADMIN"
  | "INSTRUCTOR"
  | "ASSESSOR"
  | "CANDIDATE"
  | "PROCTOR"
  | "READONLY";

export type Permission =
  // Items
  | "items:read"
  | "items:create"
  | "items:update"
  | "items:delete"
  | "items:generate"
  | "items:export"
  // Sessions
  | "sessions:read"
  | "sessions:create"
  | "sessions:update"
  | "sessions:delete"
  | "sessions:export"
  // Candidates
  | "candidates:read"
  | "candidates:create"
  | "candidates:update"
  | "candidates:delete"
  | "candidates:export"
  | "candidates:anonymize"
  // Reports
  | "reports:read"
  | "reports:create"
  | "reports:export"
  // Analytics
  | "analytics:read"
  | "analytics:cohort"
  | "analytics:advanced"
  // Users
  | "users:read"
  | "users:create"
  | "users:update"
  | "users:delete"
  | "users:invite"
  // Organizations
  | "orgs:read"
  | "orgs:create"
  | "orgs:update"
  | "orgs:delete"
  | "orgs:billing"
  // System
  | "system:config"
  | "system:calibration"
  | "system:audit"
  | "system:deploy"
  // Proctoring
  | "proctoring:read"
  | "proctoring:flag"
  | "proctoring:override"
  // Privacy / GDPR
  | "privacy:read"
  | "privacy:export"
  | "privacy:delete"
  // Webhooks & API keys
  | "webhooks:read"
  | "webhooks:manage"
  | "apikeys:read"
  | "apikeys:manage";

// ---------------------------------------------------------------------------
// Role → Permission mapping
// ---------------------------------------------------------------------------

export const ROLE_PERMISSIONS: Record<PlatformRole, Permission[]> = {
  SUPER_ADMIN: [
    "items:read", "items:create", "items:update", "items:delete", "items:generate", "items:export",
    "sessions:read", "sessions:create", "sessions:update", "sessions:delete", "sessions:export",
    "candidates:read", "candidates:create", "candidates:update", "candidates:delete", "candidates:export", "candidates:anonymize",
    "reports:read", "reports:create", "reports:export",
    "analytics:read", "analytics:cohort", "analytics:advanced",
    "users:read", "users:create", "users:update", "users:delete", "users:invite",
    "orgs:read", "orgs:create", "orgs:update", "orgs:delete", "orgs:billing",
    "system:config", "system:calibration", "system:audit", "system:deploy",
    "proctoring:read", "proctoring:flag", "proctoring:override",
    "privacy:read", "privacy:export", "privacy:delete",
    "webhooks:read", "webhooks:manage", "apikeys:read", "apikeys:manage",
  ],
  ASSESSMENT_DIRECTOR: [
    "items:read", "items:create", "items:update", "items:delete", "items:generate", "items:export",
    "sessions:read", "sessions:create", "sessions:update", "sessions:export",
    "candidates:read", "candidates:create", "candidates:update", "candidates:export",
    "reports:read", "reports:create", "reports:export",
    "analytics:read", "analytics:cohort", "analytics:advanced",
    "users:read", "users:invite",
    "orgs:read", "orgs:update",
    "system:config", "system:calibration", "system:audit",
    "proctoring:read", "proctoring:flag",
    "privacy:read",
    "webhooks:read", "webhooks:manage", "apikeys:read", "apikeys:manage",
  ],
  INST_ADMIN: [
    "items:read", "items:create", "items:update", "items:export",
    "sessions:read", "sessions:create", "sessions:export",
    "candidates:read", "candidates:create", "candidates:update", "candidates:export",
    "reports:read", "reports:create", "reports:export",
    "analytics:read", "analytics:cohort",
    "users:read", "users:invite",
    "orgs:read", "orgs:update", "orgs:billing",
    "proctoring:read", "proctoring:flag",
    "privacy:read",
    "webhooks:read", "apikeys:read",
  ],
  DEPT_ADMIN: [
    "items:read",
    "sessions:read", "sessions:create",
    "candidates:read", "candidates:create",
    "reports:read", "reports:create",
    "analytics:read", "analytics:cohort",
    "users:read",
    "proctoring:read",
  ],
  INSTRUCTOR: [
    "items:read",
    "sessions:read",
    "candidates:read",
    "reports:read",
    "analytics:read", "analytics:cohort",
    "proctoring:read",
  ],
  ASSESSOR: [
    "items:read", "items:create", "items:update",
    "sessions:read",
    "candidates:read",
    "reports:read",
    "proctoring:read", "proctoring:flag",
  ],
  PROCTOR: [
    "sessions:read",
    "candidates:read",
    "proctoring:read", "proctoring:flag", "proctoring:override",
    "reports:read",
  ],
  CANDIDATE: [
    "sessions:create",
    "reports:read",
  ],
  READONLY: [
    "items:read",
    "sessions:read",
    "candidates:read",
    "reports:read",
    "analytics:read",
  ],
};

// ---------------------------------------------------------------------------
// Role hierarchy (higher index = more privilege)
// ---------------------------------------------------------------------------

const ROLE_HIERARCHY: PlatformRole[] = [
  "READONLY",
  "CANDIDATE",
  "ASSESSOR",
  "INSTRUCTOR",
  "PROCTOR",
  "DEPT_ADMIN",
  "INST_ADMIN",
  "ASSESSMENT_DIRECTOR",
  "SUPER_ADMIN",
];

// ---------------------------------------------------------------------------
// Role Manager
// ---------------------------------------------------------------------------

export class RoleManager {
  /**
   * Check if a role has a specific permission.
   */
  canAccess(role: PlatformRole, permission: Permission): boolean {
    const permissions = ROLE_PERMISSIONS[role];
    return permissions ? permissions.includes(permission) : false;
  }

  /**
   * Check if a user (with multiple roles) has a permission.
   */
  userCanAccess(userRoles: PlatformRole[], permission: Permission): boolean {
    return userRoles.some((role) => this.canAccess(role, permission));
  }

  /**
   * Get all permissions for a role.
   */
  getPermissions(role: PlatformRole): Permission[] {
    return ROLE_PERMISSIONS[role] ?? [];
  }

  /**
   * Get all permissions for a user with multiple roles (union).
   */
  getUserPermissions(roles: PlatformRole[]): Permission[] {
    const perms = new Set<Permission>();
    for (const role of roles) {
      for (const p of this.getPermissions(role)) {
        perms.add(p);
      }
    }
    return [...perms];
  }

  /**
   * Check if roleA has equal or greater privilege than roleB.
   */
  isAtLeast(roleA: PlatformRole, roleB: PlatformRole): boolean {
    return ROLE_HIERARCHY.indexOf(roleA) >= ROLE_HIERARCHY.indexOf(roleB);
  }

  /**
   * Get effective role (highest in hierarchy) from array.
   */
  getEffectiveRole(roles: PlatformRole[]): PlatformRole {
    return roles.reduce((highest, role) => {
      return ROLE_HIERARCHY.indexOf(role) > ROLE_HIERARCHY.indexOf(highest) ? role : highest;
    }, "READONLY" as PlatformRole);
  }

  /**
   * Parse role string from DB (handles legacy role names).
   */
  parseRole(roleString: string): PlatformRole {
    const normalised = roleString?.toUpperCase() as PlatformRole;
    return ROLE_PERMISSIONS[normalised] ? normalised : "READONLY";
  }

  /**
   * Validate a permission string.
   */
  isValidPermission(p: string): p is Permission {
    const all = Object.values(ROLE_PERMISSIONS).flat();
    return all.includes(p as Permission);
  }

  /**
   * Generate a permission summary for display.
   */
  summarizePermissions(role: PlatformRole): Record<string, string[]> {
    const perms = this.getPermissions(role);
    const groups: Record<string, string[]> = {};
    for (const p of perms) {
      const [group, action] = p.split(":");
      if (!groups[group]) groups[group] = [];
      groups[group].push(action);
    }
    return groups;
  }
}

export const roleManager = new RoleManager();
