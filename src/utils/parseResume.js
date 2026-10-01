const fs = require('fs/promises');
const path = require('path');

// Extract plain text from an uploaded resume (pdf / docx / doc / txt).
async function parseResume(filePath, originalName = '') {
  const ext = (path.extname(originalName || filePath) || '').toLowerCase();
  if (ext === '.pdf') {
    const pdfMod = require('pdf-parse');
    const buf = await fs.readFile(filePath);
    let text = '';
    if (typeof pdfMod === 'function') {
      // pdf-parse v1 API
      const data = await pdfMod(buf);
      text = data.text || '';
    } else if (pdfMod.PDFParse) {
      // pdf-parse v2 API
      const parser = new pdfMod.PDFParse({ data: buf });
      try {
        const result = await parser.getText();
        text = result.text || '';
      } finally {
        if (typeof parser.destroy === 'function') await parser.destroy().catch(() => {});
      }
    }
    return (text || '').trim();
  }
  if (ext === '.docx') {
    const mammoth = require('mammoth');
    const { value } = await mammoth.extractRawText({ path: filePath });
    return (value || '').trim();
  }
  if (ext === '.txt') {
    return (await fs.readFile(filePath, 'utf8')).trim();
  }
  // .doc (legacy binary) has no lightweight parser here — fall back to best effort.
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return raw.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 20000);
  } catch {
    return '';
  }
}

module.exports = { parseResume };
