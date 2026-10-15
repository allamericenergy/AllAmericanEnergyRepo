import path from "node:path";

const agreementPrefixes: Record<string, string> = {
  gas: "GSA",
  power: "ESA",
  sewer: "SEWERSA",
  solar: "SolarSA",
  water: "WSA"
};

function monthYear(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  }).format(date).replace(" ", "");
}

export function contractUploadFileName(input: {
  originalName: string;
  productName: string;
  companyName: string;
  startDate: Date;
  endDate: Date;
  uploadedAt?: Date;
}) {
  const prefix = agreementPrefixes[input.productName.trim().toLowerCase()];
  if (!prefix) return input.originalName;

  const extension = path.extname(input.originalName);
  const startMonth = monthYear(input.startDate);
  const endMonth = monthYear(input.endDate);
  const currentMonth = monthYear(input.uploadedAt ?? new Date());

  return `${prefix}_${input.companyName.trim()}_${startMonth} to ${endMonth}_${currentMonth}${extension}`;
}
