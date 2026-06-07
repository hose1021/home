export type Role = "admin" | "management_member" | "commandant" | "owner";

export type Permission = 
  | "tenant:read" | "tenant:write"
  | "building:read" | "building:write"
  | "unit:read" | "unit:write"
  | "owner:read" | "owner:write"
  | "resident:read" | "resident:write"
  | "voting:read" | "voting:write"
  | "meeting:read" | "meeting:write"
  | "protocol:read" | "protocol:write" | "protocol:sign"
  | "finance:read" | "finance:write"
  | "charge:read" | "charge:write"
  | "payment:read" | "payment:write"
  | "debt:read" | "debt:write"
  | "fund:read" | "fund:write"
  | "budget:read" | "budget:write"
  | "contractor:read" | "contractor:write"
  | "work_order:read" | "work_order:write"
  | "ticket:read" | "ticket:write"
  | "document:read" | "document:write"
  | "announcement:read" | "announcement:write"
  | "notification:send"
  | "audit:read" | "audit:write"
  | "report:read" | "report:generate"
  | "settings:read" | "settings:write"
  | "user:manage";

const rolePermissions: Record<Role, Permission[]> = {
  admin: ["tenant:read", "tenant:write", "building:read", "building:write", "unit:read", "unit:write", "owner:read", "owner:write", "resident:read", "resident:write", "voting:read", "voting:write", "meeting:read", "meeting:write", "protocol:read", "protocol:write", "protocol:sign", "finance:read", "finance:write", "charge:read", "charge:write", "payment:read", "payment:write", "debt:read", "debt:write", "fund:read", "fund:write", "budget:read", "budget:write", "contractor:read", "contractor:write", "work_order:read", "work_order:write", "ticket:read", "ticket:write", "document:read", "document:write", "announcement:read", "announcement:write", "notification:send", "audit:read", "audit:write", "report:read", "report:generate", "settings:read", "settings:write", "user:manage"],
  management_member: ["building:read", "unit:read", "owner:read", "resident:read", "voting:read", "voting:write", "meeting:read", "meeting:write", "protocol:read", "protocol:sign", "finance:read", "charge:read", "payment:read", "debt:read", "fund:read", "budget:read", "budget:write", "contractor:read", "contractor:write", "work_order:read", "ticket:read", "document:read", "announcement:read", "announcement:write", "notification:send"],
  commandant: ["building:read", "building:write", "unit:read", "unit:write", "owner:read", "resident:read", "ticket:read", "ticket:write", "work_order:read", "work_order:write", "contractor:read", "announcement:read", "announcement:write"],
  owner: ["building:read", "unit:read", "owner:read", "resident:read", "voting:read", "voting:write", "meeting:read", "protocol:read", "charge:read", "payment:read", "payment:write", "debt:read", "fund:read", "budget:read", "ticket:read", "ticket:write", "document:read", "report:read"],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}

export function getPermissionsForRole(role: Role): Permission[] {
  return rolePermissions[role] ?? [];
}
