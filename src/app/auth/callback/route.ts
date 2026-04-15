import type { NextRequest } from "next/server";
import { handleAuthCallback } from "@/lib/auth/confirmation-callback";
import { NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const url = new URL(request.url);
    const accessToken = url.searchParams.get("access_token");
    const refreshToken = url.searchParams.get("refresh_token");
    const type = url.searchParams.get("type");

    if (type === "recovery" && accessToken && refreshToken) {
        const redirectUrl = new URL("/auth/auth-code-error", url.origin);
        redirectUrl.searchParams.set("type", "recovery");
        return NextResponse.redirect(redirectUrl);
    }

    return handleAuthCallback(request);
}
