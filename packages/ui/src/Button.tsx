"use client";

import React from "react";
import clsx from "clsx";

export function Button(
    props: React.ButtonHTMLAttributes<HTMLButtonElement> & {
        variant?: "primary" | "secondary" | "ghost" | "destructive";
        size?: "sm" | "md" | "lg";
    },
) {
    const { variant = "primary", size = "md", className, ...rest } = props;

    const variants = {
        primary: "bg-primary text-primary-foreground hover:opacity-90 shadow-sm",
        secondary:
            "bg-card text-card-foreground hover:bg-muted border border-border shadow-sm",
        ghost: "text-muted-foreground hover:text-foreground hover:bg-muted",
        destructive: "bg-destructive text-destructive-foreground hover:opacity-90",
    } as const;

    const sizes = {
        sm: "px-2.5 py-1.5 text-xs",
        md: "px-4 py-2 text-sm",
        lg: "px-6 py-3 text-base",
    } as const;

    return (
        <button
            className={clsx(
                "rounded-lg font-medium transition-all flex items-center justify-center gap-2",
                variants[variant],
                sizes[size],
                className,
            )}
            {...rest}
        />
    );
}
