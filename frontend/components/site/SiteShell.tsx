"use client";

import { Toaster } from "sonner";
import type { PropsWithChildren } from "react";

/**
 * App shell: sonner toaster (ember-themed) + children.
 * Sits inside Providers so toasts can be fired from any client island.
 */
export function SiteShell({ children }: PropsWithChildren) {
  return (
    <>
      {children}
      <Toaster
        position="bottom-right"
        theme="dark"
        toastOptions={{
          classNames: {
            toast:
              "rounded-2xl border border-border bg-card text-card-foreground shadow-card",
            description: "text-muted-foreground",
            actionButton: "bg-primary text-primary-foreground",
            cancelButton: "bg-muted text-muted-foreground",
          },
        }}
      />
    </>
  );
}
