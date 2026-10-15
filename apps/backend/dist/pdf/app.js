import express from 'express';
import multer from 'multer';
import { PDFParse } from 'pdf-parse';
import { readBillRows, extractBillFields } from './bill-fields.js';
export function createApp({ maxFileSizeMB = 10, extractionPath = '/api/pdf/extract' } = {}) {
    if (!Number.isFinite(maxFileSizeMB) || maxFileSizeMB <= 0) {
        throw new Error('MAX_FILE_SIZE_MB must be a positive number.');
    }
    const app = express();
    app.disable('x-powered-by');
    const upload = multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: Math.floor(maxFileSizeMB * 1024 * 1024), files: 1, fields: 0, parts: 1 },
    });
    app.get('/health', (_req, res) => res.json({ status: 'ok' }));
    app.post(extractionPath, (req, res, next) => {
        if (!req.is('multipart/form-data')) {
            return res.status(415).json({ error: { code: 'INVALID_CONTENT_TYPE', message: 'Send multipart/form-data with a file field named pdf.' } });
        }
        next();
    }, upload.single('pdf'), async (req, res, next) => {
        res.set('Cache-Control', 'no-store');
        if (!req.file) {
            return res.status(400).json({ error: { code: 'MISSING_FILE', message: 'Upload a PDF in the pdf field.' } });
        }
        if (!req.file.buffer.subarray(0, 1024).includes(Buffer.from('%PDF-'))) {
            return res.status(415).json({ error: { code: 'INVALID_FILE_TYPE', message: 'The uploaded file is not a PDF.' } });
        }
        let parser;
        try {
            parser = new PDFParse({ data: req.file.buffer });
            const result = await parser.getText({ lineEnforce: true, cellSeparator: '\t', pageJoiner: '' });
            const metadata = await parser.getInfo();
            const pages = result.pages.map(page => {
                const text = page.text.replace(/\r\n?/g, '\n');
                // A final newline terminates the last line; it does not create another line.
                const lineTexts = text === '' ? [] : text.replace(/\n$/, '').split('\n');
                return {
                    pageNumber: page.num,
                    text,
                    lines: lineTexts.map((text, index) => ({ lineNumber: index + 1, text })),
                };
            });
            const lines = pages.flatMap(page => page.lines.map(line => ({ pageNumber: page.pageNumber, ...line })));
            const text = pages.map(page => page.text).join('\n\n');
            const structured = extractBillFields(await readBillRows(req.file.buffer));
            res.json({
                fileName: req.file.originalname,
                sizeBytes: req.file.size,
                pageCount: result.total,
                ...structured,
                text,
                lines,
                pages,
                metadata: metadata.info ?? {},
                warnings: text.trim() ? [] : ['No extractable text found. Scanned or image-only PDFs may require OCR.'],
            });
        }
        catch (error) {
            if (error.name === 'PasswordException') {
                res.status(422).json({ error: { code: 'PASSWORD_PROTECTED', message: 'Upload an unencrypted PDF; password-protected PDFs are not supported.' } });
            }
            else if (['InvalidPDFException', 'FormatError', 'UnknownErrorException'].includes(error.name)) {
                res.status(422).json({ error: { code: 'UNREADABLE_PDF', message: 'The PDF is damaged or cannot be read.' } });
            }
            else {
                next(error);
            }
        }
        finally {
            if (parser)
                await parser.destroy().catch(error => console.error('PDF cleanup failed:', error.name));
        }
    });
    app.use((_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found.' } }));
    app.use((error, _req, res, _next) => {
        if (error instanceof multer.MulterError) {
            const oversized = error.code === 'LIMIT_FILE_SIZE';
            return res.status(oversized ? 413 : 400).json({ error: {
                    code: error.code,
                    message: oversized ? `PDF exceeds the ${maxFileSizeMB} MB limit.` : 'Send exactly one file in the pdf field and no other fields.',
                } });
        }
        if (/Unexpected end of (form|multipart data)/i.test(error.message)) {
            return res.status(400).json({ error: { code: 'INVALID_MULTIPART', message: 'The multipart upload is incomplete.' } });
        }
        console.error('Extraction failed:', error.name);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Unable to process the PDF.' } });
    });
    return app;
}
