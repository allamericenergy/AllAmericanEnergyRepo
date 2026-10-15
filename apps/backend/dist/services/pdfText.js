import { PDFParse } from "pdf-parse";
const MAX_RETURNED_TEXT_LENGTH = 250_000;
export async function extractPdfText(fileBuffer) {
    const parser = new PDFParse({ data: fileBuffer });
    try {
        const result = await parser.getText();
        const normalizedText = result.text.replace(/\r\n/g, "\n").trim();
        const truncated = normalizedText.length > MAX_RETURNED_TEXT_LENGTH;
        return {
            text: truncated ? normalizedText.slice(0, MAX_RETURNED_TEXT_LENGTH) : normalizedText,
            pageCount: result.total,
            characterCount: normalizedText.length,
            truncated,
            warning: normalizedText
                ? truncated
                    ? "The extracted text preview was shortened because the document is very large."
                    : undefined
                : "No embedded text was found. The PDF may contain scanned images and require OCR."
        };
    }
    finally {
        await parser.destroy();
    }
}
