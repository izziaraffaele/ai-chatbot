import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { signIn } from "@/app/(auth)/auth";
import {
  isDevelopmentEnvironment,
  isProductionEnvironment,
} from "@/lib/constants";

/**
 * Determines if secure cookies should be used based on environment and request origin.
 * Secure cookies require HTTPS, but localhost connections are inherently secure.
 */
function shouldUseSecureCookie(request: Request): boolean {
  // Never use secure cookies in development
  if (isDevelopmentEnvironment) {
    return false;
  }

  // Check if request is from localhost or 127.0.0.1
  try {
    const url = new URL(request.url);
    const hostname = url.hostname.toLowerCase();
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1"
    ) {
      return false;
    }
  } catch {
    // If URL parsing fails, fall back to environment-based decision
  }

  // Use secure cookies for production with real domains
  return isProductionEnvironment;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const redirectUrl = searchParams.get("redirectUrl") || "/";

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: shouldUseSecureCookie(request),
  });

  if (token) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return signIn("guest", { redirect: true, redirectTo: redirectUrl });
}
