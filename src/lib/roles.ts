/**
 * Role model (display layer).
 *
 * LiftLoop is a university carpool: any community member can be a **User**
 * (take rides) or a **Service** (offer rides). The role is chosen per-login at
 * the panel — the same email can sign in as either. **Admin** is the sole
 * university operator.
 *
 * The Supabase backend keeps its existing `user_type` values
 * (`student` = User, `driver` = Service, `admin`, `both`, `pending_admin`) so
 * RLS/auth/edge functions are untouched. This module maps those internal values
 * to the user-facing naming and routes.
 */

export type UserType = "student" | "driver" | "admin" | "both" | "pending_admin";

/** Panel/role keys used at login (kept as the internal values for the backend). */
export type RoleKey = "student" | "driver" | "admin";

export const ROLE_LABEL: Record<RoleKey, string> = {
  student: "User",
  driver: "Service",
  admin: "Admin",
};

/** Human label for any stored user_type. */
export function roleLabel(t?: UserType | null): string {
  switch (t) {
    case "driver":
      return "Service";
    case "admin":
      return "Admin";
    case "pending_admin":
      return "Pending admin";
    case "both":
      return "User"; // a member who both rides and offers — defaults to the User view
    case "student":
    default:
      return "User";
  }
}

/** Home dashboard route for a stored user_type. */
export function dashboardPath(t?: UserType | null): string {
  switch (t) {
    case "admin":
      return "/admin";
    case "pending_admin":
      return "/pending-admin";
    case "driver":
      return "/service";
    case "both":
    case "student":
    default:
      return "/user";
  }
}
