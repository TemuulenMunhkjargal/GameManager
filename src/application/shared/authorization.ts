import type { Membership } from "../../domain/organizations/membership";
import { failure, success, type Result } from "../../domain/shared/result";

export function requireEventManagement(membership: Membership | null): Result<true> {
  if (!membership || !membership.canManageEvents()) {
    return failure("You do not have permission to manage events for this organization.");
  }

  return success(true);
}
