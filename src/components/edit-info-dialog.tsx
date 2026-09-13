"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { updateUserProfileInfo } from "@/server/actions/update-user-profile";
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

type EditInfoDialogProps = {
  currentFullName: string;
  triggerLabel?: string;
  triggerClassName?: string;
  /** Called after a successful save (e.g. to show feedback in the parent). */
  onSaved?: () => void;
};

const triggerFallbackClass =
  "inline-flex h-10 items-center justify-center whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export function EditInfoDialog({
  currentFullName,
  triggerLabel = "Edit information",
  triggerClassName,
  onSaved,
}: EditInfoDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(currentFullName);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      // Always start from the latest saved name when reopening.
      setName(currentFullName);
      setError(null);
    }
  }

  function save(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updateUserProfileInfo({ fullName: name });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setOpen(false);
      onSaved?.();
      // Refresh the shell/topbar so the new name shows everywhere.
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button type="button" className={triggerClassName ?? triggerFallbackClass}>
          {triggerLabel}
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit information</DialogTitle>
          <DialogDescription>
            Update the display name shown across your workspace. Your email
            address cannot be changed here.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Full Name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={120}
              required
              autoComplete="name"
              className="border-input focus-visible:ring-ring flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background transition placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </label>
          {error ? (
            <p
              role="alert"
              className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-4 py-2 text-sm"
            >
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <DialogClose asChild>
              <button
                type="button"
                disabled={isPending}
                className="border-input bg-background hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring inline-flex h-10 items-center justify-center whitespace-nowrap rounded-md border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              >
                Cancel
              </button>
            </DialogClose>
            <button
              type="submit"
              disabled={isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring inline-flex h-10 items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            >
              {isPending ? "Saving…" : "Save changes"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
