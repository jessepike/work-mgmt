"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { IconX } from "@tabler/icons-react";

interface ModalProps {
    open: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    className?: string;
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;

        if (open && !dialog.open) {
            dialog.showModal();
        } else if (!open && dialog.open) {
            dialog.close();
        }
    }, [open]);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;

        const handleClose = () => onClose();
        dialog.addEventListener("close", handleClose);
        return () => dialog.removeEventListener("close", handleClose);
    }, [onClose]);

    if (!open) return null;

    return (
        <dialog
            ref={dialogRef}
            className="bg-transparent p-0 m-auto backdrop:bg-black/60 backdrop:backdrop-blur-sm"
            onClick={(e) => { if (e.target === dialogRef.current) onClose(); }}
        >
            <div className={cn(
                "bg-zed-sidebar border border-zed-border rounded-lg shadow-2xl w-[480px] max-w-[90vw]",
                className
            )}>
                <div className="flex items-center justify-between px-6 h-12 border-b border-zed-border">
                    <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
                    <button
                        onClick={onClose}
                        className="text-text-muted hover:text-text-secondary transition-colors"
                    >
                        <IconX className="w-4 h-4" />
                    </button>
                </div>
                <div className="p-6">
                    {children}
                </div>
            </div>
        </dialog>
    );
}
