import { headers } from "next/headers";
import type { AuthenticatedUser, CurrentUserProvider } from "../../application/organizations/ports";
import { auth } from "./auth";

export class BetterAuthCurrentUserProvider implements CurrentUserProvider {
  public async getCurrentUser(): Promise<AuthenticatedUser | null> {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) {
      return null;
    }

    return {
      id: session.user.id,
      email: session.user.email,
      displayName: session.user.name,
    };
  }
}
