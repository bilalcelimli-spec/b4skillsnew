/**
 * b4skills RBAC Express Middleware
 *
 * Provides:
 *  - requirePermission(permission) — gates on a specific permission
 *  - requireRole(...roles)        — gates on role membership
 *  - requireAtLeast(role)         — gates on role hierarchy level
 *  - auditLog                     — logs access attempts
 */

import type { Request, Response, NextFunction } from "express";
import { roleManager, type Permission, type PlatformRole } from "../lib/rbac/role-manager.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getUserRoles(req: Request): PlatformRole[] {
  const user = (req as any).user;
  if (!user) return [];
  // Support single role string or array
  const roles: string[] = Array.isArray(user.roles)
    ? user.roles
    : user.role
      ? [user.role]
      : [];
  return roles.map((r: string) => roleManager.parseRole(r));
}

function forbiddenResponse(res: Response, message: string): void {
  res.status(403).json({ error: "Forbidden", message, code: "RBAC_DENIED" });
}

function unauthorisedResponse(res: Response): void {
  res.status(401).json({ error: "Unauthorised", message: "Authentication required", code: "UNAUTHENTICATED" });
}

// ---------------------------------------------------------------------------
// Middleware factories
// ---------------------------------------------------------------------------

/**
 * Require a specific permission. Attaches user permission set to req.
 *
 * @example app.get('/api/reports', requirePermission('reports:read'), handler)
 */
export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user;
    if (!user) { unauthorisedResponse(res); return; }

    const roles = getUserRoles(req);
    if (roles.length === 0) { forbiddenResponse(res, "No roles assigned"); return; }

    if (!roleManager.userCanAccess(roles, permission)) {
      console.warn(`[RBAC] DENIED ${user.id} (${roles.join(",")}) → ${permission} on ${req.path}`);
      forbiddenResponse(res, `Permission '${permission}' required`);
      return;
    }

    // Attach permissions to request for downstream use
    (req as any).userPermissions = roleManager.getUserPermissions(roles);
    next();
  };
}

/**
 * Require membership in one of the listed roles.
 *
 * @example app.get('/api/admin', requireRole('SUPER_ADMIN', 'INST_ADMIN'), handler)
 */
export function requireRole(...allowedRoles: PlatformRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user;
    if (!user) { unauthorisedResponse(res); return; }

    const roles = getUserRoles(req);
    const hasRole = roles.some((r) => allowedRoles.includes(r));

    if (!hasRole) {
      console.warn(`[RBAC] DENIED ${user.id} (${roles.join(",")}) — required one of [${allowedRoles.join(",")}]`);
      forbiddenResponse(res, `One of roles [${allowedRoles.join(", ")}] required`);
      return;
    }

    (req as any).userPermissions = roleManager.getUserPermissions(roles);
    next();
  };
}

/**
 * Require a role at least as privileged as the given role in the hierarchy.
 *
 * @example app.delete('/api/items/:id', requireAtLeast('ASSESSMENT_DIRECTOR'), handler)
 */
export function requireAtLeast(minRole: PlatformRole) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user;
    if (!user) { unauthorisedResponse(res); return; }

    const roles = getUserRoles(req);
    const effective = roleManager.getEffectiveRole(roles);
    if (!roleManager.isAtLeast(effective, minRole)) {
      console.warn(`[RBAC] DENIED ${user.id} (effective=${effective}) — required at least ${minRole}`);
      forbiddenResponse(res, `Role '${minRole}' or above required`);
      return;
    }

    (req as any).userPermissions = roleManager.getUserPermissions(roles);
    next();
  };
}

/**
 * Scope-check: candidate can only access their own data, admins can access any.
 */
export function requireSelfOrRole(paramName: string, ...adminRoles: PlatformRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user;
    if (!user) { unauthorisedResponse(res); return; }

    const paramId = req.params[paramName];
    const isSelf = user.id === paramId;
    if (isSelf) { next(); return; }

    const roles = getUserRoles(req);
    const hasAdminRole = roles.some((r) => adminRoles.includes(r));
    if (!hasAdminRole) {
      forbiddenResponse(res, `Can only access own data or requires admin role`);
      return;
    }
    next();
  };
}

/**
 * Organisation-scoped access: user must belong to the org or be SUPER_ADMIN.
 */
export function requireOrgAccess(paramName = "id") {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    if (!user) { unauthorisedResponse(res); return; }

    const roles = getUserRoles(req);
    if (roles.includes("SUPER_ADMIN")) { next(); return; }

    const orgId = req.params[paramName];
    if (!orgId) { forbiddenResponse(res, "Organisation ID required"); return; }

    // User's org must match the requested org
    const userOrgId = user.organizationId;
    if (userOrgId !== orgId) {
      forbiddenResponse(res, "Access to this organisation is not allowed");
      return;
    }

    next();
  };
}

/**
 * Attach user permissions to req without blocking (for informational use).
 */
export function attachPermissions(req: Request, _res: Response, next: NextFunction): void {
  const roles = getUserRoles(req);
  (req as any).userPermissions = roleManager.getUserPermissions(roles);
  (req as any).effectiveRole = roleManager.getEffectiveRole(roles);
  next();
}
