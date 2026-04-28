const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

const app      = express();
const PORT     = process.env.PORT || 3000;
const PASSWORD = process.env.UPLOAD_PASSWORD || 'bi2026';
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE    = path.join(DATA_DIR, 'current.csv');
const DATA_FILE_MS = path.join(DATA_DIR, 'current_ms.csv');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

app.use(express.static(path.join(__dirname, 'public')));

// ─── DIGITAÇÃO ────────────────────────────────────────────────────────────────
app.get('/data', (req, res) => {
  if (!fs.existsSync(DATA_FILE))
    return res.status(404).json({ error: 'Nenhum dado disponível ainda.' });
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(DATA_FILE);
});

app.get('/status', (req, res) => {
  if (!fs.existsSync(DATA_FILE)) return res.json({ hasData: false });
  const stats = fs.statSync(DATA_FILE);
  res.json({ hasData: true, updatedAt: stats.mtime });
});

// ─── MARKET SHARE ─────────────────────────────────────────────────────────────
app.get('/ms-data', (req, res) => {
  if (!fs.existsSync(DATA_FILE_MS))
    return res.status(404).json({ error: 'Nenhum dado de MS disponível.' });
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(DATA_FILE_MS);
});

app.get('/ms-status', (req, res) => {
  if (!fs.existsSync(DATA_FILE_MS)) return res.json({ hasData: false });
  const stats = fs.statSync(DATA_FILE_MS);
  res.json({ hasData: true, updatedAt: stats.mtime });
});

// ─── UPLOAD ───────────────────────────────────────────────────────────────────
const upload = multer({
  dest: DATA_DIR,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.originalname.toLowerCase().endsWith('.csv'))
      return cb(new Error('Apenas arquivos .csv são aceitos.'));
    cb(null, true);
  }
});

app.post('/upload', upload.single('csv'), (req, res) => {
  const senha = req.headers['x-password'];
  if (senha !== PASSWORD) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(401).json({ error: 'Senha incorreta.' });
  }
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
  fs.renameSync(req.file.path, DATA_FILE);
  const stats = fs.statSync(DATA_FILE);
  res.json({ ok: true, message: 'Dados de Digitação atualizados!', updatedAt: stats.mtime });
});

app.post('/ms-upload', upload.single('csv'), (req, res) => {
  const senha = req.headers['x-password'];
  if (senha !== PASSWORD) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(401).json({ error: 'Senha incorreta.' });
  }
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
  fs.renameSync(req.file.path, DATA_FILE_MS);
  const stats = fs.statSync(DATA_FILE_MS);
  res.json({ ok: true, message: 'Dados de Market Share atualizados!', updatedAt: stats.mtime });
});

app.use((err, req, res, next) => {
  if (req.file) try { fs.unlinkSync(req.file.path); } catch {}
  res.status(400).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`BI Veículos rodando em http://localhost:${PORT}`);
});
