"use client";

import { useState, useTransition, type FormEvent } from "react";
import { createUserAccount } from "@/server/actions/create-user-account";
import { useRouter } from "next/navigation";

type Account = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  joined: string;
  assignedCount: number;
};

type AccountsWorkspaceProps = {
  accounts: Account[];
  canCreateAccounts: boolean;
};

const roleLabels: Record<string, string> = {
  staff: "Staff",
  admin: "Admin",
  super_admin: "Super admin",
};

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function RoleBadge({ role }: { role: string }) {
  return <span className="inline-flex rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">{roleLabels[role] ?? role}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const active = status.toLowerCase() === "active";
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{status}</span>;
}

export function AccountsWorkspace({ accounts, canCreateAccounts }: AccountsWorkspaceProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState("staff");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function closeModal() {
    setModalOpen(false);
    setErrorMessage(null);
    setSelectedRole("staff");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const form = new FormData(event.currentTarget);
    const fullName = String(form.get("name") ?? "");
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");
    const role = String(form.get("role") ?? "staff") as "staff" | "admin" | "super_admin";
    const taskNotes = String(form.get("taskNotes") ?? "");

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    startTransition(async () => {
      const result = await createUserAccount({
        fullName,
        email,
        password,
        role,
        taskNotes: taskNotes || undefined,
        // Student assignment picker can be wired in later — for now,
        // new staff accounts start unassigned and an admin assigns
        // specific students afterward from the student detail page.
        assignedStudentIds: [],
      });

      if (!result.success) {
        setErrorMessage(result.error);
        return;
      }

      closeModal();
      router.refresh(); // re-fetches accounts server-side, shows the new one
    });
  }

  return (
    <section className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
      <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Directory</p><h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">User accounts</h3><p className="mt-1 text-sm text-slate-500">Manage access, roles, and account status.</p></div>
        {canCreateAccounts && (
          <button type="button" onClick={() => setModalOpen(true)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#635BFF] px-4 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(99,91,255,0.2)] transition hover:bg-[#5148e5] focus:outline-none focus:ring-2 focus:ring-[#635BFF] focus:ring-offset-2"><span className="text-lg leading-none">+</span>Create user</button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[780px] w-full border-collapse text-left">
          <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500"><tr className="border-b border-slate-200"><th className="px-6 py-3.5">User</th><th className="px-6 py-3.5">Role</th><th className="px-6 py-3.5">Status</th><th className="px-6 py-3.5">Joined</th><th className="px-6 py-3.5 text-right">Actions</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {accounts.length === 0 ? <tr><td colSpan={5} className="px-6 py-14 text-center text-sm text-slate-500">No user accounts have been added yet. Create the first account to get started.</td></tr> : accounts.map((account) => <tr key={account.id} className="group transition hover:bg-slate-50/70"><td className="px-6 py-4"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f1f2ff] text-xs font-bold text-[#635BFF]">{initials(account.name)}</span><div><p className="font-semibold text-slate-900">{account.name}</p><p className="mt-0.5 text-xs text-slate-500">{account.email}</p>{account.role === "staff" && <p className="mt-0.5 text-xs text-slate-400">{account.assignedCount} student{account.assignedCount === 1 ? "" : "s"} assigned</p>}</div></div></td><td className="px-6 py-4"><RoleBadge role={account.role} /></td><td className="px-6 py-4"><StatusBadge status={account.status} /></td><td className="px-6 py-4 text-sm text-slate-500">{account.joined}</td><td className="relative px-6 py-4 text-right"><button type="button" onClick={() => setMenuId(menuId === account.id ? null : account.id)} className="rounded-lg px-2 py-1 text-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label={`Actions for ${account.name}`}>⋯</button>{menuId === account.id && <div className="absolute right-5 top-12 z-10 w-36 rounded-xl border border-slate-200 bg-white p-1.5 text-left text-sm shadow-lg"><button className="w-full rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-50">Edit account</button><button className="w-full rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-50">Deactivate</button></div>}</td></tr>)}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-7"><span>Showing <strong className="font-semibold text-slate-700">{accounts.length}</strong> account{accounts.length === 1 ? "" : "s"}</span><span className="text-slate-400">Access is managed by administrators</span></div>

      {modalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="create-user-title"><div className="w-full max-w-lg overflow-hidden rounded-[24px] bg-white shadow-[0_24px_90px_rgba(15,23,42,0.2)]"><div className="flex items-start justify-between border-b border-slate-100 px-6 py-5"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#635BFF]">New account</p><h2 id="create-user-title" className="mt-1 text-xl font-semibold text-slate-950">Create a user</h2><p className="mt-1 text-sm text-slate-500">Add a staff member or administrator to the workspace.</p></div><button type="button" onClick={closeModal} className="rounded-lg px-2 py-1 text-2xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close modal">×</button></div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {errorMessage}
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-semibold text-slate-700">Full name<input required name="name" type="text" placeholder="e.g. Maria Santos" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#635BFF] focus:ring-2 focus:ring-[#635BFF]/10" /></label>
            <label className="space-y-2 text-sm font-semibold text-slate-700">Role
              <select required name="role" value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal text-slate-700 outline-none focus:border-[#635BFF] focus:ring-2 focus:ring-[#635BFF]/10">
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
                <option value="super_admin">Super admin</option>
              </select>
            </label>
          </div>

          <label className="block space-y-2 text-sm font-semibold text-slate-700">Email address<input required name="email" type="email" placeholder="name@school.edu" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#635BFF] focus:ring-2 focus:ring-[#635BFF]/10" /></label>

          {selectedRole === "staff" && (
            <label className="block space-y-2 text-sm font-semibold text-slate-700">
              Monitoring task / notes
              <textarea
                name="taskNotes"
                rows={2}
                placeholder="e.g. Monitor promotion grades for SY 2025-2026 — students to be assigned after creation"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#635BFF] focus:ring-2 focus:ring-[#635BFF]/10"
              />
              <span className="block text-xs font-normal text-slate-400">
                Specific students get assigned from each student&apos;s profile page after the account is created.
              </span>
            </label>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-semibold text-slate-700">Temporary password<input required minLength={8} name="password" type="password" placeholder="At least 8 characters" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#635BFF] focus:ring-2 focus:ring-[#635BFF]/10" /></label>
            <label className="space-y-2 text-sm font-semibold text-slate-700">Confirm password<input required minLength={8} name="confirmPassword" type="password" placeholder="Repeat password" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#635BFF] focus:ring-2 focus:ring-[#635BFF]/10" /></label>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
            <button type="button" onClick={closeModal} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={isPending} className="rounded-xl bg-[#635BFF] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#5148e5] disabled:opacity-60">
              {isPending ? "Creating..." : "Create user"}
            </button>
          </div>
        </form>
      </div></div>}
    </section>
  );
}