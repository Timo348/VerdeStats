const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const AdmZip = require('adm-zip');
const { analyzeDirectory } = require('../lib/analyzer');

const router = express.Router();
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const sessionId = req.headers['x-session-id'] || crypto.randomUUID();
    req.sessionId = sessionId;
    const dest = path.join(UPLOAD_DIR, sessionId);
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 } // 500 MB
});

function getSessionPath(sessionId) {
  return path.join(UPLOAD_DIR, sessionId);
}

function ensureSession(sessionId) {
  const sessionPath = getSessionPath(sessionId);
  if (!fs.existsSync(sessionPath)) {
    throw new Error('Session not found');
  }
  return sessionPath;
}

router.post('/api/upload', upload.array('files', 200), (req, res) => {
  try {
    const sessionId = req.sessionId || crypto.randomUUID();
    const sessionPath = getSessionPath(sessionId);

    // Handle optional single zip file
    const zipFile = req.files?.find(f => f.originalname.toLowerCase().endsWith('.zip'));
    if (zipFile) {
      const zip = new AdmZip(zipFile.path);
      zip.extractAllTo(sessionPath, true);
      fs.unlinkSync(zipFile.path);
    }

    const jsonFiles = fs.readdirSync(sessionPath).filter(f => f.endsWith('.json'));

    res.json({
      success: true,
      sessionId,
      fileCount: jsonFiles.length,
      files: jsonFiles
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/api/analyze', express.json(), (req, res) => {
  try {
    const { sessionId, startDate, endDate, minMs } = req.body;
    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'Missing sessionId' });
    }
    const sessionPath = ensureSession(sessionId);
    const result = analyzeDirectory(sessionPath, { startDate, endDate, minMs: Number(minMs) || 0 });
    res.json({ success: true, result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
