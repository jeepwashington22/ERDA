import { requireCurrentUser } from "@/lib/current-user";
import { ProfileForms } from "./ProfileForms";

export const metadata = { title: "My Profile | Erda Scholar System" };

const roleLabels: Record<string, string> = {
  staff: "Staff",
  admin: "Administrator",
  super_admin: "Super Administrator",
};

export default async function ProfilePage() {
  const user = await requireCurrentUser();

  return (
    <div className="flex h-full w-full flex-col gap-4 overflow-y-auto bg-slate-100 p-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-950">My Profile</h2>
        <p className="text-xs text-slate-500">
          View your account details, edit your information, and change your password.
        </p>

        <ProfileForms
          userId={user.id}
          email={user.email}
          fullName={user.fullName ?? ""}
          role={roleLabels[user.role ?? ""] ?? (user.role ?? "Unknown")}
        />
      </div>
    </div>
  );
}
