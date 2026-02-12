"use client";

import { FormEvent, useEffect, useState } from "react";
import { IconSearch, IconPlus, IconLogout } from "@tabler/icons-react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
    const router = useRouter();
    const pathname = usePathname();
    const [query, setQuery] = useState("");

    useEffect(() => {
        if (pathname !== "/search") {
            setQuery("");
            return;
        }
        if (typeof window === "undefined") return;
        const params = new URLSearchParams(window.location.search);
        setQuery(params.get("q") || "");
    }, [pathname]);

    function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const normalized = query.trim();
        if (!normalized) {
            router.push("/search");
            return;
        }
        router.push(`/search?q=${encodeURIComponent(normalized)}`);
    }

    return (
        <header className="h-12 flex items-center justify-between px-6 bg-zed-header border-b border-zed-border">
            <div className="flex items-center gap-4">
                <h1 className="text-sm font-semibold text-text-primary tracking-tight">Work Management</h1>
                <div className="h-4 w-[1px] bg-zed-border opacity-50"></div>

                <form
                    onSubmit={handleSubmit}
                    className="flex items-center text-text-secondary bg-zed-main border border-zed-border rounded px-2 py-0.5 h-7 focus-within:border-primary/50 transition-all group"
                >
                    <IconSearch className="w-3.5 h-3.5 mr-2 text-text-muted group-focus-within:text-primary transition-colors" />
                    <input
                        className="bg-transparent border-none p-0 text-xs focus:ring-0 placeholder-text-muted w-48 text-text-primary"
                        placeholder="Global search..."
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </form>
            </div>

            <div className="flex items-center gap-3">
                <ThemeToggle />
                <button className="w-7 h-7 flex items-center justify-center bg-primary rounded-full text-white hover:opacity-90 active:scale-95 transition-all shadow-sm shadow-primary/20">
                    <IconPlus className="w-4 h-4" />
                </button>
                <button
                    onClick={async () => {
                        const supabase = createClient();
                        await supabase.auth.signOut();
                        router.push("/auth/login");
                        router.refresh();
                    }}
                    title="Sign out"
                    className="w-7 h-7 rounded-full bg-zed-active border border-zed-border flex items-center justify-center overflow-hidden cursor-pointer hover:border-text-secondary transition-colors group"
                >
                    <div className="w-full h-full bg-gradient-to-br from-primary/40 to-zed-border flex items-center justify-center text-[10px] font-bold text-text-primary group-hover:hidden">
                        JP
                    </div>
                    <IconLogout className="w-3.5 h-3.5 text-text-secondary hidden group-hover:block" />
                </button>
            </div>
        </header>
    );
}
