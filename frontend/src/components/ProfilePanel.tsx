import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

type ProfilePanelProps = {
  session: Session;
  open: boolean;
  onClose: () => void;
  onSaveSuccess?: (message: string) => void;
};

const getMetadataValue = (metadata: Record<string, unknown> | undefined, key: string) => {
  const value = metadata?.[key];
  return typeof value === "string" ? value : "";
};

const departmentOptions = [
  "Civil Engineering",
  "Mechanical Engineering",
  "Electrical Engineering",
  "Chemical Engineering",
  "Computer Science",
  "Electronics Engineering",
  "Biotechnology",
  "Architecture",
  "Administration",
  "Facilities",
  "Operations",
];

const titleOptions = [
  "Faculty",
  "Research Scholar",
  "Teaching Assistant",
  "Administrator",
  "Coordinator",
  "Manager",
  "Engineer",
  "Technician",
  "Intern",
  "Student",
];

const organizationOptions = [
  "TIET",
  "Campus",
  "Regional Office",
  "Central Administration",
  "Department",
  "Center",
  "Laboratory",
];

export const ProfilePanel = ({ session, open, onClose, onSaveSuccess }: ProfilePanelProps) => {
  const [avatarUrl, setAvatarUrl] = useState("");
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [title, setTitle] = useState("");
  const [organization, setOrganization] = useState("");
  const [bio, setBio] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const metadata = (session.user.user_metadata ?? {}) as Record<string, unknown>;

    setFullName(getMetadataValue(metadata, "full_name"));
    setAvatarUrl(getMetadataValue(metadata, "avatar_url"));
    setDepartment(getMetadataValue(metadata, "department"));
    setAddress(getMetadataValue(metadata, "address"));
    setPhone(getMetadataValue(metadata, "phone"));
    setTitle(getMetadataValue(metadata, "title"));
    setOrganization(getMetadataValue(metadata, "organization"));
    setBio(getMetadataValue(metadata, "bio"));
    setEmail(session.user.email ?? "");
    setNewPassword("");
    setConfirmPassword("");
    setMessage(null);
    setError(null);
    setSaving(false);
  }, [open, session]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedEmail = email.trim();
    const trimmedPassword = newPassword.trim();
    const trimmedConfirmPassword = confirmPassword.trim();

    if (trimmedPassword && trimmedPassword !== trimmedConfirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    const updatePayload: Parameters<typeof supabase.auth.updateUser>[0] = {
      data: {
        avatar_url: avatarUrl.trim(),
        full_name: fullName.trim(),
        department: department.trim(),
        address: address.trim(),
        phone: phone.trim(),
        title: title.trim(),
        organization: organization.trim(),
        bio: bio.trim(),
      },
    };

    if (trimmedEmail && trimmedEmail !== session.user.email) {
      updatePayload.email = trimmedEmail;
    }

    if (trimmedPassword) {
      updatePayload.password = trimmedPassword;
    }

    const { error: updateError } = await supabase.auth.updateUser(updatePayload);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    const messages = ["Profile updated successfully."];
    if (trimmedEmail && trimmedEmail !== session.user.email) {
      messages.push("If you changed your email, check your inbox to confirm it.");
    }
    if (trimmedPassword) {
      messages.push("Your password has been updated.");
    }

    const fullMessage = messages.join(" ");
    setMessage(fullMessage);
    onSaveSuccess?.(fullMessage);
    setNewPassword("");
    setConfirmPassword("");
    setSaving(false);
  };

  const uploadAvatar = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file for profile picture.");
      return;
    }

    setUploadingAvatar(true);
    setError(null);
    setMessage(null);

    const extension = file.name.includes(".") ? file.name.split(".").pop() : "png";
    const filePath = `profiles/${session.user.id}/${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("profile-pictures")
      .upload(filePath, file, { upsert: true, cacheControl: "3600" });

    if (uploadError) {
      setUploadingAvatar(false);
      setError(uploadError.message);
      return;
    }

    const { data } = supabase.storage.from("profile-pictures").getPublicUrl(filePath);
    setAvatarUrl(data.publicUrl);
    setUploadingAvatar(false);
    setMessage("Profile image uploaded. Save changes to persist it in profile metadata.");
  };

  const handleAvatarInput = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadAvatar(file);
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 px-4 py-4 backdrop-blur-sm sm:px-6 lg:px-8">
      <aside className="ml-auto flex h-full w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-carbon-900 text-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5 sm:px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/10 text-lg font-semibold text-white">
              {avatarUrl.trim() ? (
                <img src={avatarUrl.trim()} alt="Profile avatar" className="h-full w-full object-cover" />
              ) : (
                <span>{(fullName || session.user.email || "C").slice(0, 1).toUpperCase()}</span>
              )}
            </div>
            <div>
            <p className="text-xs uppercase tracking-[0.35em] text-carbon-200/70">Profile</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Account settings</h2>
            <p className="mt-1 text-sm text-carbon-100/75">Edit general info, contact details, and credentials.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium transition hover:bg-white/10"
          >
            Close
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 sm:px-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
            <section className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
              <h3 className="text-lg font-semibold">General Info</h3>
              <p className="mt-1 text-sm text-carbon-100/70">This data is saved in your Supabase user metadata.</p>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="sm:col-span-2">
                  <span className="mb-2 block text-sm font-medium text-carbon-50">Profile Picture</span>
                  <div
                    onDragEnter={(event) => {
                      event.preventDefault();
                      setDragActive(true);
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDragActive(true);
                    }}
                    onDragLeave={(event) => {
                      event.preventDefault();
                      setDragActive(false);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      setDragActive(false);
                      const file = event.dataTransfer.files?.[0];
                      if (file) {
                        void uploadAvatar(file);
                      }
                    }}
                    className={`rounded-2xl border-2 border-dashed px-4 py-6 text-sm text-center transition ${
                      dragActive ? "border-white/50 bg-white/10" : "border-white/20 bg-white/5"
                    }`}
                  >
                    <p className="text-carbon-100/80">Drop image here or choose a file</p>
                    <p className="mt-1 text-xs text-carbon-200/60">PNG, JPG, WEBP supported</p>
                    <label className="mt-3 inline-flex cursor-pointer rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/15">
                      {uploadingAvatar ? "Uploading..." : "Choose Image"}
                      <input type="file" accept="image/*" className="hidden" onChange={(event) => void handleAvatarInput(event)} />
                    </label>
                  </div>
                  <input
                    value={avatarUrl}
                    onChange={(event) => setAvatarUrl(event.target.value)}
                    placeholder="Or paste image URL directly"
                    className="mt-3 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-carbon-100/35 focus:border-white/25"
                  />
                </label>
                <Field label="Full name" value={fullName} onChange={setFullName} placeholder="Your name" />
                <label>
                  <span className="mb-2 block text-sm font-medium text-carbon-50">Department</span>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-carbon-800 px-4 py-3 text-sm text-white outline-none transition focus:border-white/25 appearance-none cursor-pointer"
                    style={{
                      backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`
                    }}
                  >
                    <option value="" className="bg-carbon-800 text-white">Select department</option>
                    {departmentOptions.map((opt) => (
                      <option key={opt} value={opt} className="bg-carbon-800 text-white">
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="mb-2 block text-sm font-medium text-carbon-50">Title / Role</span>
                  <select
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-carbon-800 px-4 py-3 text-sm text-white outline-none transition focus:border-white/25 appearance-none cursor-pointer"
                    style={{
                      backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`
                    }}
                  >
                    <option value="" className="bg-carbon-800 text-white">Select title</option>
                    {titleOptions.map((opt) => (
                      <option key={opt} value={opt} className="bg-carbon-800 text-white">
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="mb-2 block text-sm font-medium text-carbon-50">Organization</span>
                  <select
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-carbon-800 px-4 py-3 text-sm text-white outline-none transition focus:border-white/25 appearance-none cursor-pointer"
                    style={{
                      backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`
                    }}
                  >
                    <option value="" className="bg-carbon-800 text-white">Select organization</option>
                    {organizationOptions.map((opt) => (
                      <option key={opt} value={opt} className="bg-carbon-800 text-white">
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>
                <Field label="Phone" value={phone} onChange={setPhone} placeholder="+91 ..." />
                <Field label="Address" value={address} onChange={setAddress} placeholder="Office / home address" />
                <label className="sm:col-span-2">
                  <span className="mb-2 block text-sm font-medium text-carbon-50">Bio / Notes</span>
                  <textarea
                    value={bio}
                    onChange={(event) => setBio(event.target.value)}
                    rows={4}
                    placeholder="Anything useful for your profile"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-carbon-100/35 focus:border-white/25"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
              <h3 className="text-lg font-semibold">Security</h3>
              <p className="mt-1 text-sm text-carbon-100/70">Change your email or password here.</p>

              <div className="mt-5 space-y-4">
                <label>
                  <span className="mb-2 block text-sm font-medium text-carbon-100/80">Email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@tiet.edu"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-carbon-100/35 focus:border-white/25"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-sm font-medium text-carbon-100/80">New password</span>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="Leave blank to keep current password"
                    minLength={6}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-carbon-100/35 focus:border-white/25"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-sm font-medium text-carbon-100/80">Confirm new password</span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Repeat the new password"
                    minLength={6}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-carbon-100/35 focus:border-white/25"
                  />
                </label>

                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs leading-5 text-carbon-100/70">
                  Email changes may require confirmation. Password changes take effect immediately after saving.
                </div>
              </div>
            </section>
          </div>

          {error ? <p className="mt-5 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</p> : null}
          {message ? <p className="mt-5 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{message}</p> : null}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
            <p className="text-xs text-carbon-200/60">Profile data is stored in Supabase user metadata for this account.</p>
            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-carbon-900 transition hover:bg-carbon-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
};

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

const Field = ({ label, value, onChange, placeholder }: FieldProps) => (
  <label>
    <span className="mb-2 block text-sm font-medium text-carbon-100/80">{label}</span>
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-carbon-100/35 focus:border-white/25"
    />
  </label>
);
