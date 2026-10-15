import { writeFileSync } from 'node:fs';
import { createAccountReportPdf } from '../apps/frontend/src/features/organizations/accountReportPdf';
const base = { company: 'E & J Parts Cleaning', city: 'WATERBURY', utility: 'Eversource', month: '2026-09', address: '1669 THOMASTON AVE' };
const doc = createAccountReportPdf([
  { ...base, account: '51547293084', utilityType: 'Electric', cents: 187849, statementDate: '2026-09-14', processedDate: '2026-09-20' },
  { ...base, account: '57471220095', utilityType: 'Natural Gas', cents: 119280, statementDate: '2026-09-02', processedDate: '2026-09-09' }
]);
writeFileSync('tmp/account-report-check.pdf', Buffer.from(doc.output('arraybuffer')));
