import { Alert, Box, Button, MenuItem, Paper, TextField, Typography } from "@mui/material";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { api } from "../../lib/api";

const registerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(12),
  role: z.enum(["admin", "member", "user"]).default("user")
});

type RegisterForm = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const [message, setMessage] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterForm>({
    defaultValues: { role: "user" }
  });

  async function submit(values: RegisterForm) {
    const parsed = registerSchema.parse(values);
    const endpoint = parsed.role === "user" ? "/auth/register" : "/auth/admin/register";
    const response = await api.post(endpoint, parsed);
    setMessage(`Created ${response.data.user.email}. Verification token generated for local handoff.`);
  }

  return (
    <Box className="auth-page">
      <Paper className="auth-panel" elevation={0}>
        <Typography variant="overline">AllAmericanEnergy</Typography>
        <Typography variant="h4">Register account</Typography>
        {message ? <Alert severity="success">{message}</Alert> : null}
        <Box component="form" onSubmit={handleSubmit(submit)} className="auth-form">
          <TextField label="First name" error={Boolean(errors.firstName)} helperText={errors.firstName?.message} {...register("firstName")} />
          <TextField label="Last name" error={Boolean(errors.lastName)} helperText={errors.lastName?.message} {...register("lastName")} />
          <TextField label="Email" error={Boolean(errors.email)} helperText={errors.email?.message} {...register("email")} />
          <TextField label="Password" type="password" error={Boolean(errors.password)} helperText={errors.password?.message ?? "Minimum 12 chars with uppercase, lowercase, number, and special character."} {...register("password")} />
          <TextField label="Role" select defaultValue="user" {...register("role")}>
            <MenuItem value="user">User</MenuItem>
            <MenuItem value="member">Member</MenuItem>
            <MenuItem value="admin">Administrator</MenuItem>
          </TextField>
          <Button type="submit" variant="contained" disabled={isSubmitting}>Create account</Button>
        </Box>
      </Paper>
    </Box>
  );
}
