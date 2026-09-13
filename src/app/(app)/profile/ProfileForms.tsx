"use client";

import { useState, useTransition } from "react";
import { changeUserPassword } from "@/server/actions/update-user-profile";
import { EditInfoDialog } from "@/components/edit-info-dialog";

type Props = {
  userId: string;
  email: string;
  fullName: string;
  role: string;
};

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-semibold text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function Feedback({ message, kind }: { message: string | null; kind: "ok" | "err" }) {
  if (!message) return null;
  const cls =
    kind === "ok"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-red-200 bg-red-50 text-red-700";
  return <p className={`rounded-lg border px-4 py-2 text-sm ${cls}`}>{message}</p>;
}

export function ProfileForms({ userId, email, fullName, role }: Props) {
  const [isPending, startTransition] = useTransition();

  // ---- Account info (view + edit name via modal) ----
  const [infoOk, setInfoOk] = useState<string | null>(null);

  // ---- Change password ----
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwOk, setPwOk] = useState<string | null>(null);
  const [pwErr, setPwErr] = useState<string | null>(null);

  function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwOk(null);
    setPwErr(null);

    if (newPassword !== confirmPassword) {
      setPwErr("The new passwords do not match.");
      return;
    }

    startTransition(async () => {
      const result = await changeUserPassword({ currentPassword, newPassword });
      if (!result.success) {
        setPwErr(result.error);
        return;
      }
      setPwOk("Your password has been changed.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    });
  }

  return (
    <div className="mt-4 flex flex-col gap-6">
      {/* ---- Account overview ---- */}
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-950">Account Information</h3>
          <EditInfoDialog
            currentFullName={fullName}
            triggerLabel="Edit info"
            triggerClassName="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
            onSaved={() => setInfoOk("Your information has been updated.")}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold text-slate-500">Full Name</p>
            <p className="text-sm text-slate-900">{fullName || "—"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Email</p>
            <p className="text-sm text-slate-900">{email}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Role</p>
            <p className="text-sm text-slate-900">{role}</p>
          </div>
        </div>

        <Feedback message={infoOk} kind="ok" />
      </section>

      {/* ---- Change password ---- */}
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <h3 className="mb-4 text-sm font-semibold text-slate-950">Change Password</h3>
        <form onSubmit={savePassword} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Current Password">
              <input
                type="password"
                className={inputCls}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </Field>
            <Field label="New Password">
              <input
                type="password"
                className={inputCls}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </Field>
            <Field label="Confirm New Password">
              <input
                type="password"
                className={inputCls}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </Field>
          </div>
          <p className="text-xs text-slate-500">Must be at least 8 characters.</p>
          <Feedback message={pwErr} kind="err" />
          <Feedback message={pwOk} kind="ok" />
          <button
            type="submit"
            disabled={isPending}
            className="w-fit rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {isPending ? "Updating..." : "Change Password"}
          </button>
        </form>
      </section>

      <p className="text-xs text-slate-400">Account ID: {userId}</p>
    </div>
  );
}
