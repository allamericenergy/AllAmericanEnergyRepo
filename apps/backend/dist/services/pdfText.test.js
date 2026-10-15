import { describe, expect, it } from "vitest";
import { extractPdfText } from "./pdfText.js";
function createTextPdf(text) {
    const content = `BT /F1 12 Tf 72 100 Td (${text}) Tj ET`;
    const objects = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 150] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`
    ];
    let pdf = "%PDF-1.4\n";
    const offsets = [0];
    objects.forEach((body, index) => {
        offsets.push(Buffer.byteLength(pdf));
        pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
    });
    const xrefOffset = Buffer.byteLength(pdf);
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += "0000000000 65535 f \n";
    for (const offset of offsets.slice(1))
        pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return Buffer.from(pdf);
}
describe("extractPdfText", () => {
    it("extracts text and page information from a PDF buffer", async () => {
        const result = await extractPdfText(createTextPdf("Hello Energy Bill"));
        expect(result.text).toContain("Hello Energy Bill");
        expect(result.pageCount).toBe(1);
        expect(result.characterCount).toBeGreaterThan(0);
        expect(result.truncated).toBe(false);
        expect(result.warning).toBeUndefined();
    });
});
