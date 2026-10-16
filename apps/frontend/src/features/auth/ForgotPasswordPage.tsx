import { Alert, Box, Button, Paper, TextField, Typography } from "@mui/material";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { api } from "../../lib/api";

const forgotPasswordSchema = z.object({
  email: z.string().email()
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

const resetPasswordSchema = z.object({
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

export function ForgotPasswordPage() {
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [completedPassword, setCompletedPassword] = useState("");
  const resetEmail = searchParams.get("email");
  const resetToken = searchParams.get("token");
  const isResetLink = Boolean(resetEmail && resetToken);
  const requestForm = useForm<ForgotPasswordForm>({
    defaultValues: { email: "" }
  });
  const resetForm = useForm<ResetPasswordForm>({
    mode: "onChange",
    defaultValues: { newPassword: "", confirmPassword: "" }
  });
  const resetValues = resetForm.watch();
  const isResetFormValid = resetPasswordSchema.safeParse(resetValues).success;

  async function submit(values: ForgotPasswordForm) {
    setMessage("");
    setError("");
    const resetWindow = window.open("", "_blank");
    try {
      const parsed = forgotPasswordSchema.parse(values);
      const response = await api.post<{ email?: string; resetToken?: string }>("/auth/request-password-reset", parsed);
      if (!response.data.email || !response.data.resetToken) {
        resetWindow?.close();
        setError("No account was found for this email address.");
        return;
      }
      const resetUrl = new URL("/forgot-password", window.location.origin);
      resetUrl.searchParams.set("email", response.data.email);
      resetUrl.searchParams.set("token", response.data.resetToken);
      if (resetWindow) resetWindow.location.href = resetUrl.toString();
      else window.open(resetUrl.toString(), "_blank", "noopener,noreferrer");
      setMessage("The password reset page opened in a new tab. No email was sent.");
    } catch (submitError) {
      resetWindow?.close();
      setError(submitError instanceof z.ZodError ? submitError.issues[0]?.message ?? "Invalid email address." : "Unable to request password reset. Please try again.");
    }
  }

  async function resetPassword(values: ResetPasswordForm) {
    if (!resetEmail || !resetToken) return;
    setMessage("");
    setError("");
    try {
      const parsed = resetPasswordSchema.parse(values);
      await api.post("/auth/reset-password", { email: resetEmail, token: resetToken, newPassword: parsed.newPassword });
      setCompletedPassword(parsed.newPassword);
      setMessage("Congratulations! Your password was reset successfully.");
      resetForm.reset();
    } catch (resetError) {
      setError(resetError instanceof z.ZodError ? resetError.issues[0]?.message ?? "Invalid password." : "Unable to reset password. The link may be invalid or expired.");
    }
  }

  return (
    <Box className="auth-page">
      <Paper className="auth-panel" elevation={0}>
        <Box component="img" className="auth-logo" src="/logo.png" alt="iEnergyBill" />
        <Typography variant="h4">{completedPassword ? "Password reset complete" : isResetLink ? "Reset password" : "Forgot password"}</Typography>
        <Typography color="text.secondary">{isResetLink
          ? completedPassword ? "Congratulations! You can now use your new password to sign in." : "Enter and confirm your new password."
          : "Enter your email to open the password reset page in a new tab."}</Typography>
        {message ? <Alert severity="success">{message}</Alert> : null}
        {error ? <Alert severity="error">{error}</Alert> : null}
        {completedPassword ? (
          <Box className="auth-form">
            <TextField label="Your new password" value={completedPassword} slotProps={{ input: { readOnly: true } }} />
            <Button component={Link} to="/login" variant="contained">Continue to login</Button>
          </Box>
        ) : isResetLink ? (
          <Box component="form" onSubmit={resetForm.handleSubmit(resetPassword)} className="auth-form">
            <TextField label="New password" type="password" required error={Boolean(resetForm.formState.errors.newPassword)} helperText={resetForm.formState.errors.newPassword?.message ?? "Minimum 12 chars with uppercase, lowercase, number, and special character."} {...resetForm.register("newPassword")} />
            <TextField label="Confirm password" type="password" required error={Boolean(resetForm.formState.errors.confirmPassword)} helperText={resetForm.formState.errors.confirmPassword?.message} {...resetForm.register("confirmPassword")} />
            <Button type="submit" variant="contained" disabled={!isResetFormValid || resetForm.formState.isSubmitting}>
              {resetForm.formState.isSubmitting ? "Resetting..." : "Reset password"}
            </Button>
          </Box>
        ) : (
          <Box component="form" onSubmit={requestForm.handleSubmit(submit)} className="auth-form">
            <TextField label="Email" type="email" required error={Boolean(requestForm.formState.errors.email)} helperText={requestForm.formState.errors.email?.message} {...requestForm.register("email")} />
            <Button type="submit" variant="contained" disabled={requestForm.formState.isSubmitting}>
              {requestForm.formState.isSubmitting ? "Opening..." : "Open password reset"}
            </Button>
          </Box>
        )}
        <Box className="auth-links">
          <Link to="/login">Back to login</Link>
          <Link to="/register">Create account</Link>
        </Box>
      </Paper>
    </Box>
  );
}
