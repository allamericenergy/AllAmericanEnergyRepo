import { Alert, Box, Button, Paper, TextField, Typography } from "@mui/material";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
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
    try {
      const parsed = forgotPasswordSchema.parse(values);
      await api.post("/auth/request-password-reset", parsed);
      setMessage("If an account exists for this email, password reset instructions will be sent.");
    } catch (submitError) {
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
      navigate("/login?passwordReset=1", { replace: true });
    } catch (resetError) {
      setError(resetError instanceof z.ZodError ? resetError.issues[0]?.message ?? "Invalid password." : "Unable to reset password. The link may be invalid or expired.");
    }
  }

  return (
    <Box className="auth-page">
      <Paper className="auth-panel" elevation={0}>
        <Box component="img" className="auth-logo" src="/logo.png" alt="iEnergyBill" />
        <Typography variant="h4">{isResetLink ? "Reset password" : "Forgot password"}</Typography>
        <Typography color="text.secondary">{isResetLink
          ? "Enter and confirm your new password."
          : "Enter your email and we will send password reset instructions if the account exists."}</Typography>
        {message ? <Alert severity="success">{message}</Alert> : null}
        {error ? <Alert severity="error">{error}</Alert> : null}
        {isResetLink ? (
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
              {requestForm.formState.isSubmitting ? "Sending..." : "Send reset instructions"}
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
