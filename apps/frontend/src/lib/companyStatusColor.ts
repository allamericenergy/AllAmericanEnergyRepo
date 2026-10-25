export function companyStatusColor(status: string | null | undefined) {
  const name = (status ?? "").trim().toLowerCase();
  if (!name) return { color: "#475569", backgroundColor: "#f1f5f9" };
  if (name === "active") return { color: "#fff", backgroundColor: "#0ab39c", borderRadius: "4px" };
  if (name === "inactive") return { color: "#fff", backgroundColor: "#f06548", borderRadius: "4px" };
  if (name === "sold") return { color: "#fff", backgroundColor: "#405189", borderRadius: "4px" };
  if (name === "closed") return { color: "#fff", backgroundColor: "#ff1919", borderRadius: "4px" };
  if (/^(approved|completed|complete|won)$/.test(name)) return { color: "#166534", backgroundColor: "#dcfce7" };
  if (/^(rejected|cancelled|canceled|lost)$/.test(name)) return { color: "#991b1b", backgroundColor: "#fee2e2" };
  if (/^(pending|on hold|in review|awaiting approval)$/.test(name)) return { color: "#92400e", backgroundColor: "#fef3c7" };
  const palette = [
    { color: "#1e40af", backgroundColor: "#dbeafe" },
    { color: "#6b21a8", backgroundColor: "#f3e8ff" },  
    { color: "#115e59", backgroundColor: "#ccfbf1" },
    { color: "#9d174d", backgroundColor: "#fce7f3" }
  ];
  const hash = [...name].reduce((value, character) => (value * 31 + character.charCodeAt(0)) >>> 0, 0);
  return palette[hash % palette.length];
}

export function effectiveCompanyStatus(company: { companyStatus?: string | null; isActive?: boolean }) {
  if (!company.isActive) return "Inactive";
  return company.companyStatus?.trim() || "Active";
}

export function companyRowBackground(company: { companyStatus?: string | null; isActive?: boolean }) {
  const status = effectiveCompanyStatus(company).toLowerCase();
  if (status === "inactive") return "#f1f5f9";
  if (status === "sold") return "#fee2e2";
  if (status === "closed") return "#fff1e6";
  return undefined;
}
