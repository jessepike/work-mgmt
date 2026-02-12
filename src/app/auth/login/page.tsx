"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError("");
        setLoading(true);

        const supabase = createClient();
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message);
            setLoading(false);
            return;
        }

        router.push("/");
        router.refresh();
    }

    return (
        <div className="w-full max-w-sm">
            <div className="bg-zed-surface border border-zed-border rounded-lg p-8">
                <h1 className="text-lg font-semibold text-text-primary mb-6 text-center">
                    Work Management
                </h1>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="email" className="block text-xs font-medium text-text-secondary mb-1">
                            Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full px-3 py-2 text-sm bg-zed-main border border-zed-border rounded text-text-primary placeholder-text-muted focus:outline-none focus:border-primary/50"
                            placeholder="you@example.com"
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-xs font-medium text-text-secondary mb-1">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full px-3 py-2 text-sm bg-zed-main border border-zed-border rounded text-text-primary placeholder-text-muted focus:outline-none focus:border-primary/50"
                            placeholder="Password"
                        />
                    </div>

                    {error && (
                        <p className="text-xs text-red-400">{error}</p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2 text-sm font-medium bg-primary text-white rounded hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                        {loading ? "Signing in..." : "Sign in"}
                    </button>
                </form>

                <p className="mt-4 text-center text-xs text-text-muted">
                    <Link href="/auth/signup" className="text-primary hover:underline">
                        Create account
                    </Link>
                </p>
            </div>
        </div>
    );
}
