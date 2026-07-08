require('dotenv').config();
const express = require('express');
const path = require('path');

const routes = require('./routes');
const { cleanupMiddleware } = require('./middleware/cleanup');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(cleanupMiddleware);

app.use('/', routes);

app.get('/', (req, res) => {
  res.render('index', { title: 'VerdeStats' });
});

app.get('/dashboard/:sessionId', (req, res) => {
  res.render('dashboard', {
    title: 'Dashboard | VerdeStats',
    sessionId: req.params.sessionId
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`VerdeStats listening on http://0.0.0.0:${PORT}`);
});
