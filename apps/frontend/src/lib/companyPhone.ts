export function formatCompanyPhone(value: string): string {
  // Keep unsupported input visible so validation can reject it.
  if (!/^[\d\s().-]*$/.test(value)) return value;
  const digits = value.replace(/\D/g, "");
  if (digits.length > 6) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (digits.length > 3) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return digits;
}
