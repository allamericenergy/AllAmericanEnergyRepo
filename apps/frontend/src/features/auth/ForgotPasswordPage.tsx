import { Alert, Box, Button, Paper, TextField, Typography } from "@mui/material";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";
import { api } from "../../lib/api";

const forgotPasswordSchema = z.object({
  email: z.string().email()
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordPage() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ForgotPasswordForm>({
    defaultValues: { email: "" }
  });

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

  return (
    <Box className="auth-page">
      <Paper className="auth-panel" elevation={0}>
        <Typography variant="overline">AllAmericanEnergy CRM</Typography>
        <Typography variant="h4">Forgot password</Typography>
        <Typography color="text.secondary">
          Enter your email and we will send password reset instructions if the account exists.
        </Typography>
        {message ? <Alert severity="success">{message}</Alert> : null}
        {error ? <Alert severity="error">{error}</Alert> : null}
        <Box component="form" onSubmit={handleSubmit(submit)} className="auth-form">
          <TextField label="Email" error={Boolean(errors.email)} helperText={errors.email?.message} {...register("email")} />
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? "Sending..." : "Send reset instructions"}
          </Button>
        </Box>
        <Box className="auth-links">
          <Link to="/login">Back to login</Link>
          <Link to="/register">Create account</Link>
        </Box>
      </Paper>
    </Box>
  );
}
