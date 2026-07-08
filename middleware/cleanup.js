const fs = require('fs');
const path = require('path');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const RETENTION_MS = (parseInt(process.env.UPLOAD_RETENTION_MINUTES, 10) || 30) * 60 * 1000;

function cleanupOldUploads() {
  try {
    if (!fs.existsSync(UPLOAD_DIR)) return;
    const now = Date.now();
    const entries = fs.readdirSync(UPLOAD_DIR);
    for (const entry of entries) {
      const entryPath = path.join(UPLOAD_DIR, entry);
      const stat = fs.statSync(entryPath);
      if (now - stat.mtimeMs > RETENTION_MS) {
        fs.rmSync(entryPath, { recursive: true, force: true });
      }
    }
  } catch (err) {
    console.error('Cleanup error:', err.message);
  }
}

function cleanupMiddleware(req, res, next) {
  // Non-blocking cleanup
  setImmediate(cleanupOldUploads);
  next();
}

module.exports = { cleanupMiddleware, cleanupOldUploads };
