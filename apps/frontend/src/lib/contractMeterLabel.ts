interface ContractMeterIdentifier {
  id: string | number;
  accountNumber?: string | null;
  serviceRefPod?: string | null;
  meter?: string | null;
  masterAccountNumberType?: "Account Number" | "Service Ref/POD ID" | "BOTH" | null;
}

export function contractMeterLabel(meter: ContractMeterIdentifier): string {
  const accountNumber = meter.accountNumber?.trim() || "-";
  const serviceRefPod = meter.serviceRefPod?.trim() || "-";
  switch (meter.masterAccountNumberType) {
    case "Account Number": return accountNumber;
    case "Service Ref/POD ID": return serviceRefPod;
    case "BOTH": return `${accountNumber}${serviceRefPod}`;
    default: return meter.accountNumber || meter.meter || `Meter ${meter.id}`;
  }
}
