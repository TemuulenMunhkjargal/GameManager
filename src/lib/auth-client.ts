import { createAuthClient } from "better-auth/react";

// Same-origin app, so the client just talks to /api/auth/* on whatever
// host it's loaded from — no separate base URL needed.
export const authClient = createAuthClient();

export const { signIn, signOut, useSession } = authClient;
