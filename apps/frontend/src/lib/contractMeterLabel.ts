interface ContractMeterIdentifier {
  id: string | number;
  accountNumber?: string | null;
  serviceRefPod?: string | null;
  meter?: string | null;
  masterAccountNumber?: boolean | number | null;
  masterServiceRefPodId?: boolean | number | null;
}

export function contractMeterLabel(meter: ContractMeterIdentifier): string {
  if (meter.masterAccountNumber == null && meter.masterServiceRefPodId == null) {
    return meter.accountNumber || meter.meter || `Meter ${meter.id}`;
  }
  const values: string[] = [];
  if (meter.masterAccountNumber) values.push(meter.accountNumber?.trim() || "-");
  if (meter.masterServiceRefPodId) values.push(meter.serviceRefPod?.trim() || "-");
  return values.join("") || "-";
}
