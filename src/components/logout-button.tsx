"use client";

import { useState, useTransition } from "react";

import { getBrowserSupabaseClient } from "@/lib/supabase";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type LogoutButtonProps = {
  className?: string;
};

export function LogoutButton({ className = "" }: LogoutButtonProps) {
  const [isPending, startTransition] = useTransition();

  function confirmLogout() {
    startTransition(async () => {
      const supabase = getBrowserSupabaseClient();
      await supabase.auth.signOut();
      // Full navigation so the server middleware sees the cleared cookies.
      window.location.assign("/login");
    });
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className={className}>
          Log out
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Sign out of ERDA Scholar?</DialogTitle>
          <DialogDescription>
            You will be returned to the sign-in page and will need your
            credentials to access your workspace again.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <button
              type="button"
              disabled={isPending}
              className="inline-flex h-10 items-center justify-center whitespace-nowrap rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            >
              Cancel
            </button>
          </DialogClose>
          <button
            type="button"
            onClick={confirmLogout}
            disabled={isPending}
            className="inline-flex h-10 items-center justify-center whitespace-nowrap rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          >
            {isPending ? "Signing out…" : "Yes, sign out"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
