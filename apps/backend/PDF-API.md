# PDF extraction API

The ExtractPDF service is integrated into the CRM backend. No separate service is required.
Use Node.js 22.13 or newer. Install dependencies at the repository root with `npm install`.

## Request

`POST /api/pdf/extract`

- Authenticate using the CRM's `Authorization: Bearer <access-token>` header.
- Send `multipart/form-data` with exactly one file field named `pdf`.
- Maximum size: 10 MB. Uploads are processed in memory, without saving files.

```sh
curl -X POST http://localhost:4000/api/pdf/extract \
  -H "Authorization: Bearer <access-token>" \
  -F "pdf=@bill.pdf"
```

In Postman, choose Body → form-data, set `pdf` to File, and select a PDF.

## Response

Returns `fileName`, `sizeBytes`, `pageCount`, `bill`, `extraction`, `text`,
`lines`, `pages`, `metadata`, and `warnings`, preserving the ExtractPDF API format.
Bill fields include account number, service reference, meter number, address,
usage, demand, charges, supplier, rate, and billing dates when recognized.

Check `extraction.status`, `extraction.issues`, and the evidence in
`extraction.sources` before using extracted values. Missing or ambiguous values
are null. Scanned PDFs need OCR, which is not included. No external AI service is used.

Upload errors retain `{ "error": { "code": "...", "message": "..." } }`:
400 invalid upload, 413 oversized upload, 415 unsupported content,
422 unreadable or encrypted PDF. Authentication failures return the CRM's 401 response.

## Build and test

From the repository root:

```sh
npm run build --workspace apps/backend
npm run test:pdf --workspace apps/backend
```

The build copies the JavaScript extraction modules into `dist/pdf`.
Tests cover extraction rules, uploads, authentication, and CRM route mounting.
Two optional sample-bill tests skip when their private PDF fixtures are absent.

This integration adds the API only; it does not automatically create or update meters.
