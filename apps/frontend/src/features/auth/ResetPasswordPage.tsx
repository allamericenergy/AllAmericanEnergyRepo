import { Alert, Box, Button, Paper, TextField, Typography } from "@mui/material";
import { isAxiosError } from "axios";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { api } from "../../lib/api";
import { useAuthStore } from "./authStore";

const resetPasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your temporary password."),
  newPassword: z.string()
    .min(12, "Password must be at least 12 characters.")
    .regex(/[A-Z]/, "Password must include an uppercase letter.")
    .regex(/[a-z]/, "Password must include a lowercase letter.")
    .regex(/[0-9]/, "Password must include a number.")
    .regex(/[^A-Za-z0-9]/, "Password must include a special character."),
  confirmPassword: z.string().min(1, "Confirm your new password.")
}).refine((values) => values.newPassword === values.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"]
});

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const loadMe = useAuthStore((state) => state.loadMe);
  const [error, setError] = useState("");
  const form = useForm<ResetPasswordForm>({
    mode: "onChange",
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" }
  });
  const isValid = resetPasswordSchema.safeParse(form.watch()).success;

  async function submit(values: ResetPasswordForm) {
    setError("");
    try {
      const parsed = resetPasswordSchema.parse(values);
      await api.post("/auth/change-password", {
        currentPassword: parsed.currentPassword,
        newPassword: parsed.newPassword
      });
      await loadMe();
      navigate("/dashboard", { replace: true });
    } catch (submitError) {
      if (submitError instanceof z.ZodError) {
        setError(submitError.issues[0]?.message ?? "Invalid password.");
      } else if (isAxiosError<{ error?: string }>(submitError)) {
        setError(submitError.response?.data.error ?? "Unable to change password.");
      } else {
        setError("Unable to change password.");
      }
    }
  }

  return (
    <Box className="auth-page">
      <Paper className="auth-panel" elevation={0}>
        <Link className="auth-logo-link" to="/" aria-label="Go to All American Energy home page">
          <Box component="img" className="auth-logo" src="/logo.png" alt="All American Energy" />
        </Link>
        <Typography variant="h4">Create a new password</Typography>
        <Typography color="text.secondary">
          For security, replace the temporary password sent to your email before continuing.
        </Typography>
        {error ? <Alert severity="error">{error}</Alert> : null}
        <Box component="form" onSubmit={form.handleSubmit(submit)} className="auth-form">
          <TextField
            label="Temporary password"
            type="password"
            required
            error={Boolean(form.formState.errors.currentPassword)}
            helperText={form.formState.errors.currentPassword?.message}
            {...form.register("currentPassword")}
          />
          <TextField
            label="New password"
            type="password"
            required
            error={Boolean(form.formState.errors.newPassword)}
            helperText={form.formState.errors.newPassword?.message ?? "Minimum 12 characters with uppercase, lowercase, number, and special character."}
            {...form.register("newPassword")}
          />
          <TextField
            label="Confirm new password"
            type="password"
            required
            error={Boolean(form.formState.errors.confirmPassword)}
            helperText={form.formState.errors.confirmPassword?.message}
            {...form.register("confirmPassword")}
          />
          <Button type="submit" variant="contained" disabled={!isValid || form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving..." : "Save new password"}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
