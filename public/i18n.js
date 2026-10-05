// English is the default; only an explicit language choice is remembered.
(() => {
  const german = {
  "Upload": "Dateien auswählen",
  "Spotify Extended History Analyzer": "Spotify-Verlauf auswerten",
  "Spotify listening statistics": "Spotify-Hörstatistik",
  "Upload your Extended Streaming History to explore your top songs, artists, and listening habits.": "Lade deinen erweiterten Streamingverlauf hoch, um deine meistgehörten Songs, Künstler und Hörgewohnheiten auszuwerten.",
  "Upload Streaming History": "Streamingverlauf hochladen",
  "Select all": "Wähle alle",
  "files from your Spotify data export, or upload the entire ZIP archive.": "Dateien aus deinem Spotify-Datenexport aus oder lade das gesamte ZIP-Archiv hoch.",
  "Drop files here or click to browse": "Dateien hier ablegen oder zum Auswählen klicken",
  "JSON files or a single ZIP archive": "JSON-Dateien oder ein einzelnes ZIP-Archiv",
  "Analyze Upload": "Upload auswerten",
  "Top 10": "Top 10",
  "Songs & Artists": "Songs & Künstler",
  "Time Range": "Zeitraum",
  "Custom date filter": "Eigener Datumsfilter",
  "Insights": "Einblicke",
  "Hours, weekdays, platforms": "Uhrzeiten, Wochentage, Plattformen",
  "← Back to upload": "← Zurück zur Dateiauswahl",
  "Analysis Settings": "Analyse-Einstellungen",
  "Start Date": "Startdatum",
  "End Date": "Enddatum",
  "Minimum listen time (ms)": "Mindesthörzeit (ms)",
  "Skip streams shorter than this. 30000 = 30 seconds.": "Kürzere Streams überspringen. 30000 = 30 Sekunden.",
  "Run Analysis": "Analyse starten",
  "Ready to analyze": "Bereit zur Analyse",
  "Choose a date range and click \"Run Analysis\" to generate your personalized Spotify statistics.": "Wähle einen Zeitraum und klicke auf „Analyse starten“, um deine Spotify-Hörstatistik zu erstellen.",
  "Top 10 Songs": "Top 10 Songs",
  "Top 10 Artists": "Top 10 Künstler",
  "Listening by Month": "Hörzeit pro Monat",
  "Total Time": "Gesamte Hörzeit",
  "Streams": "Streams",
  "Avg / Stream": "Ø pro Stream",
  "Files": "Dateien",
  "Peak Hour": "Meistgehörte Uhrzeit",
  "Top Day": "Meistgehörter Wochentag",
  "First Stream": "Erster Stream",
  "Top Platform": "Meistgenutzte Plattform",
  "No songs found in this range.": "Keine Songs in diesem Zeitraum gefunden.",
  "No artists found in this range.": "Keine Künstler in diesem Zeitraum gefunden.",
  "No monthly data.": "Keine Monatsdaten vorhanden.",
  "Uploading…": "Wird hochgeladen…",
  "Uploading files, please wait…": "Dateien werden hochgeladen, bitte warten…",
  "Upload failed": "Upload fehlgeschlagen",
  "Error": "Fehler",
  "Analyzing…": "Wird analysiert…",
  "Crunching your data…": "Deine Daten werden ausgewertet…",
  "Analysis failed": "Analyse fehlgeschlagen",
  "Session not found": "Sitzung nicht gefunden. Bitte lade deine Dateien erneut hoch.",
  "Missing sessionId": "Sitzungs-ID fehlt. Bitte lade deine Dateien erneut hoch.",
  "Invalid start date": "Ungültiges Startdatum",
  "Invalid end date": "Ungültiges Enddatum",
  "No JSON files found in upload": "Keine JSON-Dateien im Upload gefunden. Entpacke das ZIP-Archiv und wähle die Verlaufsdateien aus.",
  "Internal server error": "Interner Serverfehler",
  "File too large": "Datei zu groß",
  "Sunday": "Sonntag",
  "Monday": "Montag",
  "Tuesday": "Dienstag",
  "Wednesday": "Mittwoch",
  "Thursday": "Donnerstag",
  "Friday": "Freitag",
  "Saturday": "Samstag",
  "unknown": "unbekannt",
  "Tutorial": "Tutorial",
  "How to get your Spotify data": "So erhältst du deine Spotify-Daten",
  "Open Spotify privacy settings": "Spotify-Datenschutzeinstellungen öffnen",
  "Sign in to the Spotify account whose listening history you want to analyze.": "Melde dich mit dem Spotify-Konto an, dessen Hörverlauf du auswerten möchtest.",
  "Request your extended history": "Erweiterten Verlauf anfordern",
  "Scroll to “Download your data”. Under “Extended streaming history”, select “Request data”. This package covers the lifetime of your account; the regular account data only includes the past year of listening history.": "Scrolle zu „Deine Daten herunterladen“. Unter „Dein erweiterter Streamingverlauf“ klickst du auf „Daten anfordern“. Dieses Paket umfasst die gesamte Laufzeit deines Kontos; die normalen Kontodaten enthalten nur den Hörverlauf des letzten Jahres.",
  "Confirm the request and wait for the download": "Anfrage bestätigen und auf den Download warten",
  "Follow Spotify’s instructions and confirm the request by email if prompted. Spotify will email you when your export is ready. Preparing it can take time; check the estimate shown on the request page and your spam folder.": "Folge Spotifys Anweisungen und bestätige die Anfrage gegebenenfalls per E-Mail. Spotify schickt dir eine E-Mail, sobald der Export bereitsteht. Die Erstellung kann dauern; beachte die Zeitangabe auf der Anfrageseite und prüfe auch deinen Spam-Ordner.",
  "Download and upload your history": "Verlauf herunterladen und hochladen",
  "Download the ZIP using the link in Spotify’s email. Upload that ZIP here, or extract it and select all history JSON files together:": "Lade das ZIP über den Link in Spotifys E-Mail herunter. Lade es hier hoch oder entpacke es und wähle alle JSON-Verlaufsdateien zusammen aus:",
  "If uploading the ZIP finds no files, extract it first: the JSON files may be inside a subfolder. Then click “Analyze Upload” and choose your date range on the dashboard.": "Falls beim ZIP-Upload keine Dateien gefunden werden, entpacke es zuerst: Die JSON-Dateien können in einem Unterordner liegen. Klicke anschließend auf „Upload auswerten“ und wähle deinen Zeitraum im Dashboard.",
  "Spotify’s official data guide": "Spotifys offizielle Erklärung der Daten",
  "Choose files": "Dateien auswählen",
  "VerdeStats • Spotify Extended Streaming History Analyzer • Timo348": "VerdeStats • Analyse des erweiterten Spotify-Streamingverlaufs • Timo348"
};
  let language = 'en';
  try { if (localStorage.getItem('verdestats-language') === 'de') language = 'de'; } catch (_) {}
  const t = text => language === 'de' ? (german[text] || text) : text;
  function apply() {
    document.documentElement.lang = language;
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
    document.querySelectorAll('[data-language]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.language === language));
    });
  }
  window.i18n = { t, get language() { return language; }, get locale() { return language === 'de' ? 'de-DE' : 'en-US'; } };
  document.documentElement.lang = language;
  document.addEventListener('DOMContentLoaded', () => {
    apply();
    document.querySelectorAll('[data-language]').forEach(button => button.addEventListener('click', () => {
      language = button.dataset.language;
      try { localStorage.setItem('verdestats-language', language); } catch (_) {}
      apply();
      document.dispatchEvent(new Event('languagechange'));
    }));
  });
})();
