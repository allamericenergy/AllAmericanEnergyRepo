import bcrypt from "bcryptjs";

export interface PasswordPolicyResult {
  valid: boolean;
  errors: string[];
}

export function validatePasswordPolicy(password: string): PasswordPolicyResult {
  const errors: string[] = [];
  if (password.length < 12) errors.push("Password must be at least 12 characters.");
  if (!/[A-Z]/.test(password)) errors.push("Password must include an uppercase letter.");
  if (!/[a-z]/.test(password)) errors.push("Password must include a lowercase letter.");
  if (!/[0-9]/.test(password)) errors.push("Password must include a number.");
  if (!/[^A-Za-z0-9]/.test(password)) errors.push("Password must include a special character.");
  return { valid: errors.length === 0, errors };
}

export async function wasPasswordReused(password: string, hashes: string[]) {
  for (const hash of hashes) {
    if (await bcrypt.compare(password, hash)) return true;
  }
  return false;
}
