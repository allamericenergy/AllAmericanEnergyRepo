import { Alert, Box, Button, MenuItem, Paper, TextField, Typography } from "@mui/material";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { api } from "../../lib/api";
import { useAuthStore } from "./authStore";

const registerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  company: z.string().optional(),
  department: z.string().optional(),
  designation: z.string().optional(),
  password: z.string().min(12),
  role: z.enum(["admin", "user"]).default("user")
});

type RegisterForm = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [verification, setVerification] = useState<{ email: string; token: string } | null>(null);
  const [pendingLogin, setPendingLogin] = useState<{ email: string; password: string } | null>(null);
  const [pendingApproval, setPendingApproval] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterForm>({
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      company: "",
      department: "",
      designation: "",
      password: "",
      role: "user"
    }
  });

  async function submit(values: RegisterForm) {
    setError("");
    setMessage("");
    try {
      const parsed = registerSchema.parse(values);
      const response = await api.post("/auth/register", parsed);
      if (response.data.pendingApproval) {
        setPendingApproval(true);
        setMessage(`Created ${response.data.user.email}. Waiting for Super Admin approval.`);
        return;
      }
      setVerification({ email: response.data.user.email, token: response.data.verificationToken });
      setPendingLogin({ email: parsed.email, password: parsed.password });
      setMessage(`Created ${response.data.user.email}. Verify the email to enable login.`);
    } catch (submitError) {
      setError(submitError instanceof z.ZodError ? submitError.issues[0]?.message ?? "Invalid form data." : "Registration failed. The email may already exist or the password may not meet policy.");
    }
  }

  async function verifyEmail() {
    if (!verification || !pendingLogin) return;
    setError("");
    setIsVerifying(true);
    try {
      await api.post("/auth/verify-email", verification);
      await login(pendingLogin.email, pendingLogin.password, true);
      setMessage("Email verified. Redirecting to your dashboard.");
      setVerification(null);
      setPendingLogin(null);
      navigate("/");
    } catch {
      setError("Email verification succeeded only if the account is valid, but automatic login failed. Try logging in manually.");
    } finally {
      setIsVerifying(false);
    }
  }

  return (
    <Box className="auth-page">
      <Paper className="auth-panel" elevation={0}>
        <Typography variant="overline">AllAmericanEnergy</Typography>
        <Typography variant="h4">{pendingApproval ? "Pending Approval" : verification ? "Verify the email" : "Register account"}</Typography>
        {message ? <Alert severity="success">{message}</Alert> : null}
        {error ? <Alert severity="error">{error}</Alert> : null}
        {pendingApproval ? (
          <Box className="auth-form">
            <Alert severity="info">Registration submitted. Waiting for Super Admin approval.</Alert>
          </Box>
        ) : verification ? (
          <Box className="auth-form">
            <Button type="button" variant="contained" onClick={verifyEmail} disabled={isVerifying}>
              {isVerifying ? "Verifying..." : "Verify email"}
            </Button>
          </Box>
        ) : (
          <Box component="form" onSubmit={handleSubmit(submit)} className="auth-form">
            <TextField label="First name" error={Boolean(errors.firstName)} helperText={errors.firstName?.message} {...register("firstName")} />
            <TextField label="Last name" error={Boolean(errors.lastName)} helperText={errors.lastName?.message} {...register("lastName")} />
            <TextField label="Email" error={Boolean(errors.email)} helperText={errors.email?.message} {...register("email")} />
            <TextField label="Phone" {...register("phone")} />
            <TextField label="Company" {...register("company")} />
            <TextField label="Department" {...register("department")} />
            <TextField label="Designation" {...register("designation")} />
            <TextField label="Password" type="password" error={Boolean(errors.password)} helperText={errors.password?.message ?? "Minimum 12 chars with uppercase, lowercase, number, and special character."} {...register("password")} />
            <TextField label="User type" select defaultValue="user" {...register("role")}>
              <MenuItem value="user">User - public registration</MenuItem>
              <MenuItem value="admin">Administrator - superadmin required</MenuItem>
            </TextField>
            <Button type="submit" variant="contained" disabled={isSubmitting}>Create account</Button>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
