import { readFile, writeFile } from 'node:fs/promises';
import { readBillRows, extractBillFields } from '../../apps/backend/src/pdf/bill-fields.js';
const root = 'E:/OneDriveRJ/RJ Consulting/RJConsultingDocuments - Documents/';
const paths = [
 'Lipper/GB-Lipper International-57706030038-09-02-2026.pdf',
 'E&J/EB-E & J Parts Cleaning-51547293084-01-08-2026.pdf',
 'Archive/AQUARION WATER CO/WB-Canaan Parish Redevelopment-200497156-09-17-2026.pdf',
 'Archive/AQUARION WATER CO/WB-Canaan Parish-200497165-09-17-2026.pdf',
 'Archive/AQUARION WATER CO/WB-Millport Phase II-200420115-09-17-2026.pdf',
 'Archive/MDC/WB-Bloomfield-21051034-09-29-2026.pdf',
 'Archive/MDC/WB-Bradford-21117629-09-10-2026.pdf',
 'Archive/MDC/WB-Folly Brook-21125960-10-08-2026.pdf',
];
for (const [i, path] of paths.entries()) {
 const data = await readBillRows(await readFile(root + path));
 await writeFile(`tmp/pdfs/bill-${i}.json`, JSON.stringify({path:root+path, data}, null, 2));
 console.log(JSON.stringify({i,path,result:extractBillFields(data.rows ?? data)},null,2));
}
