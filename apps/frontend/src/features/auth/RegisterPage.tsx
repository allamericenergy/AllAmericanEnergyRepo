import CloseIcon from "@mui/icons-material/Close";
import { Alert, Box, Button, IconButton, Paper, TextField, Typography } from "@mui/material";
import { isAxiosError } from "axios";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { api } from "../../lib/api";

const registerSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required."),
  lastName: z.string().trim().min(1, "Last name is required."),
  email: z.string().trim().email("Enter a valid email address."),
  phone: z.string().trim().min(1, "Phone is required."),
  company: z.string().trim().min(1, "Company is required."),
  department: z.string().trim().min(1, "Department is required."),
  password: z.string()
    .min(12, "Password must be at least 12 characters.")
    .regex(/[A-Z]/, "Password must include an uppercase letter.")
    .regex(/[a-z]/, "Password must include a lowercase letter.")
    .regex(/[0-9]/, "Password must include a number.")
    .regex(/[^A-Za-z0-9]/, "Password must include a special character.")
});

type RegisterForm = z.infer<typeof registerSchema>;

const requiredText = (message: string) => ({
  validate: (value: string) => value.trim().length > 0 || message
});

export function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [localVerification, setLocalVerification] = useState<{ email: string; token: string } | null>(null);
  const verificationStarted = useRef(false);
  const linkEmail = searchParams.get("email");
  const linkToken = searchParams.get("token");
  const verificationEmail = linkEmail ?? localVerification?.email ?? null;
  const verificationToken = linkToken ?? localVerification?.token ?? null;
  const isVerificationLink = Boolean(linkEmail && linkToken);
  const { register, handleSubmit, formState: { errors, isSubmitting, isValid } } = useForm<RegisterForm>({
    mode: "onChange",
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      company: "",
      department: "",
      password: ""
    }
  });

  async function submit(values: RegisterForm) {
    setError("");
    setMessage("");
    try {
      const parsed = registerSchema.parse(values);
      const response = await api.post("/auth/register", parsed);
      setRegistrationComplete(true);
      if (response.data.emailSent) {
        setMessage(response.data.verificationResent
          ? `This account was already registered but not verified. A new verification email was sent to ${response.data.user.email}.`
          : `Account created. A verification email was sent to ${response.data.user.email}.`);
      } else if (response.data.verificationToken) {
        setLocalVerification({ email: response.data.user.email, token: response.data.verificationToken });
        setMessage(response.data.verificationResent
          ? "This development account already existed but was not verified. Use the button below to verify it."
          : "Account created. SMTP is not configured locally, so use the button below to verify this development account.");
      } else {
        setMessage("Account created, but the verification email could not be sent.");
      }
    } catch (submitError) {
      setError(registrationError(submitError));
    }
  }

  async function verifyEmail() {
    if (!verificationEmail || !verificationToken) return;
    setError("");
    setIsVerifying(true);
    try {
      await api.post("/auth/verify-email", { email: verificationEmail, token: verificationToken });
      navigate("/login?verified=1", { replace: true });
    } catch {
      setError("This verification link is invalid or has expired.");
    } finally {
      setIsVerifying(false);
    }
  }

  useEffect(() => {
    if (isVerificationLink && !verificationStarted.current) {
      verificationStarted.current = true;
      void verifyEmail();
    }
  }, [isVerificationLink, verificationEmail, verificationToken]);

  return (
    <Box className="auth-page">
      <Paper className="auth-panel" elevation={0}>
        <IconButton className="auth-close-button" aria-label="Close registration" title="Cancel and return to sign in" onClick={() => navigate("/login")}>
          <CloseIcon />
        </IconButton>
        <Box component="img" className="auth-logo" src="/logo.png" alt="iEnergyBill" />
        <Typography variant="h4">{isVerificationLink ? "Verify your email" : localVerification ? "Verify account" : registrationComplete ? "Check your email" : "Register account"}</Typography>
        {message ? <Alert severity="success">{message}</Alert> : null}
        {error ? <Alert severity="error">{error}</Alert> : null}
        {registrationComplete ? (
          <Box className="auth-form">
            {localVerification ? (
              <Button type="button" variant="contained" onClick={verifyEmail} disabled={isVerifying}>
                {isVerifying ? "Verifying..." : "Verify development account"}
              </Button>
            ) : (
              <Alert severity="info">Open the email from support@ienergybill.com and use its verification link to activate your account.</Alert>
            )}
          </Box>
        ) : isVerificationLink ? (
          <Box className="auth-form">
            <Button type="button" variant="contained" onClick={verifyEmail} disabled={isVerifying}>
              {isVerifying ? "Verifying..." : "Verify email"}
            </Button>
          </Box>
        ) : (
          <Box component="form" onSubmit={handleSubmit(submit)} className="auth-form">
            <TextField label="First name" required error={Boolean(errors.firstName)} helperText={errors.firstName?.message} {...register("firstName", requiredText("First name is required."))} />
            <TextField label="Last name" required error={Boolean(errors.lastName)} helperText={errors.lastName?.message} {...register("lastName", requiredText("Last name is required."))} />
            <TextField label="Email" type="email" required error={Boolean(errors.email)} helperText={errors.email?.message} {...register("email", { validate: (value) => registerSchema.shape.email.safeParse(value).success || "Enter a valid email address." })} />
            <TextField label="Phone" required error={Boolean(errors.phone)} helperText={errors.phone?.message} {...register("phone", requiredText("Phone is required."))} />
            <TextField label="Company" required error={Boolean(errors.company)} helperText={errors.company?.message} {...register("company", requiredText("Company is required."))} />
            <TextField label="Department" required error={Boolean(errors.department)} helperText={errors.department?.message} {...register("department", requiredText("Department is required."))} />
            <TextField label="Password" type="password" required error={Boolean(errors.password)} helperText={errors.password?.message ?? "Minimum 12 chars with uppercase, lowercase, number, and special character."} {...register("password", { validate: (value) => {
              const result = registerSchema.shape.password.safeParse(value);
              return result.success || result.error.issues[0]?.message || "Enter a valid password.";
            } })} />
            <Button type="submit" variant="contained" disabled={!isValid || isSubmitting}>{isSubmitting ? "Creating account..." : "Create account"}</Button>
          </Box>
        )}
      </Paper>
    </Box>
  );
}

function registrationError(error: unknown) {
  if (error instanceof z.ZodError) return error.issues[0]?.message ?? "Invalid form data.";
  if (isAxiosError<{ error?: string }>(error)) return error.response?.data.error ?? "Registration failed.";
  return "Registration failed. Please try again.";
}
