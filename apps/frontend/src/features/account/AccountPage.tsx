import { Alert, Avatar, Button, TextField } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Pencil, Save, Trash2, Upload, X } from "lucide-react";
import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";
import { roleLabels } from "../../lib/permissions";
import { type AuthUser, useAuthStore } from "../auth/authStore";

interface AccountResponse {
  user: AuthUser;
}

interface AccountForm {
  firstName: string;
  lastName: string;
  phone: string;
  company: string;
  department: string;
  designation: string;
  profilePhotoUrl: string | null;
}

const emptyForm: AccountForm = {
  firstName: "",
  lastName: "",
  phone: "",
  company: "",
  department: "",
  designation: "",
  profilePhotoUrl: null
};

function accountForm(user: AuthUser): AccountForm {
  return {
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    phone: user.phone ?? "",
    company: user.company ?? "",
    department: user.department ?? "",
    designation: user.designation ?? "",
    profilePhotoUrl: user.profilePhotoUrl ?? null
  };
}

export function AccountPage() {
  const loadMe = useAuthStore((state) => state.loadMe);
  const [form, setForm] = useState<AccountForm>(emptyForm);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const photoInputRef = useRef<HTMLInputElement>(null);
  const account = useQuery({
    queryKey: ["my-account"],
    queryFn: async () => (await api.get<AccountResponse>("/users/me")).data,
    retry: false
  });

  useEffect(() => {
    if (account.data?.user) setForm(accountForm(account.data.user));
  }, [account.data?.user]);

  function updateField<K extends keyof AccountForm>(field: K, value: AccountForm[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function beginEditing() {
    if (account.data?.user) setForm(accountForm(account.data.user));
    setMessage("");
    setError("");
    setIsEditing(true);
  }

  function cancelEditing() {
    if (account.data?.user) setForm(accountForm(account.data.user));
    setError("");
    setIsEditing(false);
  }

  async function selectPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setMessage("");
    setError("");
    try {
      const profilePhotoUrl = await compressProfilePhoto(file);
      updateField("profilePhotoUrl", profilePhotoUrl);
    } catch (photoError) {
      setError(photoError instanceof Error ? photoError.message : "Unable to process the selected photo.");
    }
  }

  async function saveAccount() {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("First name and last name are required.");
      return;
    }
    setIsSaving(true);
    setMessage("");
    setError("");
    try {
      await api.patch("/users/me", {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
        company: form.company.trim(),
        department: form.department.trim(),
        designation: form.designation.trim(),
        profilePhotoUrl: form.profilePhotoUrl
      });
      await Promise.all([account.refetch(), loadMe()]);
      setIsEditing(false);
      setMessage("Your account information was updated.");
    } catch (saveError) {
      setError(accountError(saveError));
    } finally {
      setIsSaving(false);
    }
  }

  const user = account.data?.user;

  return (
    <section className="page account-page">
      <div className="page-title">
        <div>
          <span className="eyebrow">Profile</span>
          <h1>View Account</h1>
        </div>
        {!isEditing ? (
          <Button variant="contained" startIcon={<Pencil size={17} />} onClick={beginEditing} disabled={!user}>Edit Information</Button>
        ) : null}
      </div>

      {message ? <Alert severity="success">{message}</Alert> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}
      {account.isError ? <Alert severity="error">{accountError(account.error)}</Alert> : null}
      {account.isLoading ? <p className="muted">Loading account information...</p> : null}

      {user ? (
        <section className="panel account-page-panel">
          <div className="account-profile-heading">
            <Avatar className="account-profile-avatar" src={form.profilePhotoUrl ?? undefined}>
              {[user.firstName, user.lastName].filter(Boolean).map((name) => name?.slice(0, 1)).join("").slice(0, 2) || user.email.slice(0, 1).toUpperCase()}
            </Avatar>
            <div>
              <h2>{[user.firstName, user.lastName].filter(Boolean).join(" ") || user.email}</h2>
              <p>{roleLabels[user.role]}</p>
            </div>
            {isEditing ? (
              <div className="account-photo-actions">
                <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => void selectPhoto(event)} />
                <Button variant="outlined" startIcon={<Upload size={17} />} onClick={() => photoInputRef.current?.click()} disabled={isSaving}>
                  {form.profilePhotoUrl ? "Change Photo" : "Upload Photo"}
                </Button>
                {form.profilePhotoUrl ? (
                  <Button color="error" variant="text" startIcon={<Trash2 size={17} />} onClick={() => updateField("profilePhotoUrl", null)} disabled={isSaving}>
                    Remove
                  </Button>
                ) : null}
                <small>JPEG, PNG, or WebP. Maximum source size 5 MB.</small>
              </div>
            ) : null}
          </div>

          <div className="company-form-grid account-profile-form">
            <TextField label="First name" required value={form.firstName} disabled={!isEditing} onChange={(event) => updateField("firstName", event.target.value)} />
            <TextField label="Last name" required value={form.lastName} disabled={!isEditing} onChange={(event) => updateField("lastName", event.target.value)} />
            <TextField label="Email" value={user.email} disabled helperText="Email changes require an account-security workflow." />
            <TextField label="Login ID" value={user.username ?? user.email} disabled />
            <TextField label="Phone" value={form.phone} disabled={!isEditing} onChange={(event) => updateField("phone", event.target.value)} />
            <TextField label="Company" value={form.company} disabled={!isEditing} onChange={(event) => updateField("company", event.target.value)} />
            <TextField label="Department" value={form.department} disabled={!isEditing} onChange={(event) => updateField("department", event.target.value)} />
            <TextField label="Designation" value={form.designation} disabled={!isEditing} onChange={(event) => updateField("designation", event.target.value)} />
            <TextField label="Account type" value={roleLabels[user.role]} disabled />
            <TextField label="Organization" value={user.organizationName ?? user.orgId ?? "-"} disabled />
            <TextField label="Status" value={user.status ?? "-"} disabled />
            <TextField label="Last login" value={user.lastLogin ? new Date(user.lastLogin).toLocaleString() : "-"} disabled />
          </div>

          {isEditing ? (
            <div className="account-profile-actions">
              <Button variant="outlined" startIcon={<X size={17} />} onClick={cancelEditing} disabled={isSaving}>Cancel</Button>
              <Button variant="contained" startIcon={<Save size={17} />} onClick={() => void saveAccount()} disabled={isSaving || !form.firstName.trim() || !form.lastName.trim()}>
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}
    </section>
  );
}

function accountError(error: unknown) {
  if (isAxiosError<{ error?: string; details?: { issues?: { message?: string }[] } }>(error)) {
    return error.response?.data.details?.issues?.[0]?.message
      ?? error.response?.data.error
      ?? "Unable to load or update your account.";
  }
  return "Unable to load or update your account.";
}

async function compressProfilePhoto(file: File) {
  const supportedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
  if (!supportedTypes.has(file.type)) throw new Error("Select a JPEG, PNG, or WebP image.");
  if (file.size > 5 * 1024 * 1024) throw new Error("The selected photo must be 5 MB or smaller.");

  const image = await loadImage(file);
  const maxDimension = 512;
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser could not process this photo.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
  if (dataUrl.length > 500_000) throw new Error("The compressed photo is still too large. Choose a smaller image.");
  return dataUrl;
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("The selected file is not a valid image."));
    };
    image.src = objectUrl;
  });
}
