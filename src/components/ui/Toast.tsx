"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { IconCheck, IconX } from "@tabler/icons-react";

type ToastType = "success" | "error";

interface ToastMessage {
    id: number;
    type: ToastType;
    message: string;
}

let toastId = 0;
const listeners: Set<(toast: ToastMessage) => void> = new Set();

export function showToast(type: ToastType, message: string) {
    const toast: ToastMessage = { id: ++toastId, type, message };
    listeners.forEach((fn) => fn(toast));
}

export function ToastContainer() {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    useEffect(() => {
        const handler = (toast: ToastMessage) => {
            setToasts((prev) => [...prev, toast]);
            setTimeout(() => {
                setToasts((prev) => prev.filter((t) => t.id !== toast.id));
            }, 3000);
        };
        listeners.add(handler);
        return () => { listeners.delete(handler); };
    }, []);

    const dismiss = useCallback((id: number) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2.5 rounded border shadow-lg text-xs font-medium animate-in slide-in-from-bottom-2",
                        toast.type === "success"
                            ? "bg-zed-sidebar border-status-green/30 text-status-green"
                            : "bg-zed-sidebar border-status-red/30 text-status-red"
                    )}
                >
                    {toast.type === "success" ? (
                        <IconCheck className="w-3.5 h-3.5" />
                    ) : (
                        <IconX className="w-3.5 h-3.5" />
                    )}
                    {toast.message}
                    <button
                        onClick={() => dismiss(toast.id)}
                        className="ml-2 text-text-muted hover:text-text-secondary"
                    >
                        <IconX className="w-3 h-3" />
                    </button>
                </div>
            ))}
        </div>
    );
}
