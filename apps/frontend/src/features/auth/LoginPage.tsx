import { Alert, Box, Button, Checkbox, FormControlLabel, Paper, TextField, Typography } from "@mui/material";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { useAuthStore } from "./authStore";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().default(false)
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const login = useAuthStore((state) => state.login);
  const [error, setError] = useState("");
  const sessionTimedOut = searchParams.get("sessionTimedOut") === "1";
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    defaultValues: {
      email: "superadmin@allamericanenergy.local",
      password: "ChangeMe123!",
      rememberMe: true
    }
  });

  async function submit(values: LoginForm) {
    setError("");
    try {
      const parsed = loginSchema.parse(values);
      await login(parsed.email, parsed.password, parsed.rememberMe);
      navigate("/");
    } catch (submitError) {
      setError(submitError instanceof z.ZodError ? submitError.issues[0]?.message ?? "Invalid form data." : "Login failed. Check credentials, email verification, and account status.");
    }
  }

  return (
    <Box className="auth-page">
      <Paper className="auth-panel" elevation={0}>
        <Typography variant="overline">AllAmericanEnergy CRM</Typography>
        <Typography variant="h4">Sign in</Typography>
        {sessionTimedOut ? <Alert severity="warning">Session timed out. Please log in again.</Alert> : null}
        {error ? <Alert severity="error">{error}</Alert> : null}
        <Box component="form" onSubmit={handleSubmit(submit)} className="auth-form">
          <TextField label="Email" error={Boolean(errors.email)} helperText={errors.email?.message} {...register("email")} />
          <TextField label="Password" type="password" error={Boolean(errors.password)} helperText={errors.password?.message} {...register("password")} />
          <FormControlLabel control={<Checkbox {...register("rememberMe")} defaultChecked />} label="Remember me" />
          <Button type="submit" variant="contained" disabled={isSubmitting}>Log in</Button>
        </Box>
        <Box className="auth-links">
          <Link to="/register">Register user</Link>
          <Link to="/forgot-password">Forgot password</Link>
        </Box>
      </Paper>
    </Box>
  );
}
