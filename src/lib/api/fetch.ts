import { cookies, headers } from "next/headers";

const API_BASE = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005";

function normalizeBase(input: string): string {
    const trimmed = input.trim().replace(/^['"]|['"]$/g, "");
    const withProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed)
        ? trimmed
        : `https://${trimmed}`;

    try {
        // Always reduce to origin so accidental path values (e.g. /portfolio) don't break API routing.
        return new URL(withProtocol).origin;
    } catch {
        return trimmed
            .replace(/\/+$/, "")
            .replace(/\/api$/i, "");
    }
}

function buildApiUrl(baseUrl: string, path: string): string {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const base = normalizeBase(baseUrl);

    // Collapse accidental duplicate /api prefixes.
    if (normalizedPath.startsWith("/api/")) {
        return `${base}${normalizedPath}`;
    }
    return `${base}${normalizedPath}`;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
    const headerStore = await headers();
    const forwardedHost = headerStore.get("x-forwarded-host");
    const host = forwardedHost || headerStore.get("host");
    const proto = headerStore.get("x-forwarded-proto") || "https";
    const runtimeBase = host ? `${proto}://${host}` : API_BASE;

    const cookieStore = await cookies();
    const res = await fetch(buildApiUrl(runtimeBase, path), {
        ...init,
        cache: "no-store",
        headers: {
            ...init?.headers,
            Cookie: cookieStore.toString(),
        },
    });

    if (!res.ok) {
        throw new Error(`API ${path} failed: ${res.status} ${res.statusText}`);
    }

    return res.json();
}
