export const DESKTOP_SESSION_COOKIE = "gamehall_session";
export const DESKTOP_SESSION_HEADER = "x-gamehall-session";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export interface DesktopSecurityConfiguration {
  enabled: boolean;
  allowedHost?: string;
  sessionToken?: string;
  schedulerToken?: string;
}

export interface DesktopRequestDetails {
  method: string;
  pathname: string;
  host: string | null;
  origin: string | null;
  secFetchSite: string | null;
  authorization: string | null;
  sessionHeader: string | null;
  cookieHeader: string | null;
}

export type DesktopRequestDecision =
  | { allowed: true }
  | { allowed: false; status: 401 | 403 | 421 | 503; reason: string };

function readCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() === name) return part.slice(separator + 1).trim();
  }
  return null;
}

function bearerToken(authorization: string | null): string | null {
  if (!authorization?.startsWith("Bearer ")) return null;
  return authorization.slice("Bearer ".length);
}

export function authorizeDesktopRequest(
  request: DesktopRequestDetails,
  configuration: DesktopSecurityConfiguration,
): DesktopRequestDecision {
  if (!configuration.enabled) return { allowed: true };

  const { allowedHost, sessionToken, schedulerToken } = configuration;
  if (!allowedHost || !sessionToken) {
    return { allowed: false, status: 503, reason: "Desktop security is not configured." };
  }

  if (request.host?.toLowerCase() !== allowedHost.toLowerCase()) {
    return { allowed: false, status: 421, reason: "The request host is not allowed." };
  }

  const isSchedulerRequest = request.pathname.startsWith("/api/cron/")
    && Boolean(schedulerToken)
    && bearerToken(request.authorization) === schedulerToken;
  const requestSession = request.sessionHeader ?? readCookie(request.cookieHeader, DESKTOP_SESSION_COOKIE);
  if (!isSchedulerRequest && requestSession !== sessionToken) {
    return { allowed: false, status: 401, reason: "A valid desktop session is required." };
  }

  if (!SAFE_METHODS.has(request.method.toUpperCase()) && !isSchedulerRequest) {
    if (request.origin !== `http://${allowedHost}`) {
      return { allowed: false, status: 403, reason: "The request origin is not allowed." };
    }
    if (request.secFetchSite !== "same-origin") {
      return { allowed: false, status: 403, reason: "Cross-site requests are not allowed." };
    }
  }

  return { allowed: true };
}
