import { handleAuthCallback } from "@/lib/auth/confirmation-callback";

export async function GET(request: Request) {
    return handleAuthCallback(request);
}
