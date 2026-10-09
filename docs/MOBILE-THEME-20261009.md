# Mobile und Legacy-Theme

Stand: 09.10.2026.

Modern bleibt Standard. Der neue Modern/Legacy-Schalter steht neben EN/DE auf
Startseite und Dashboard. Legacy übernimmt die frühere Palette aus
der ursprünglichen Anwendung: Schwarz, Neon-Grün,
kräftige grüne Buttons und grüne Ränder an Statistikflächen. Die Gestaltung
umfasst auch Diagramme, Tabellen, Suche, Filter, Rückblicke und Dialoge.
Keine externen Schriften, Bilder, Abhängigkeiten oder Ressourcen.

Die frühe Anwendung in `public/theme.js` stellt eine gespeicherte Auswahl vor
dem Laden der Stylesheets wieder her und setzt die Browser-Themefarbe.
Ausdrückliche Theme-Auswahl speichert ausschließlich `modern`/`legacy` unter
`verdestats-theme`; Sprache bleibt unter `verdestats-language`. Ohne
Speicherzugriff funktionieren beide Schalter für die aktuelle Seite.
Hördateien, Ergebnisse, Filter und Widget-Anordnung bleiben im Arbeitsspeicher.
Die Speicherhinweise in App und technischer Dokumentation berücksichtigen
nun das Theme. Rechtliche Hinweise ergänzt der jeweilige Betreiber.

## Mobile Bedienung

Bis 800 CSS-Pixeln öffnet Menu ein natives Dialogmenü mit allen elf Bereichen.
Ein gemeinsames Navigationselement wird zwischen Desktop und Dialog verschoben;
keine duplizierten Listen oder divergierenden Zustände. Tastaturfokus bleibt im
Dialog; Escape, Auswahl und Größenwechsel schließen ihn. Der Hintergrund
scrollt während des offenen Menüs nicht. Daten verwerfen ist im Menü erreichbar.

Filter sind auf kleinen Displays einklappbar, auf Desktop geöffnet. Ein gültiges
Absenden schließt die mobilen Filter; Ergebnisse und angewendeter Zeitraum
bleiben sichtbar. Eingaben verwenden mobil 16px, Buttons und Sprach-/Themewahl
mindestens 44px. Verbesserte Such-, Ranking-, Tabellen-, Statistik- und
Dialoglayouts; lange Namen werden in Rankings über bis zu zwei Zeilen angezeigt.
Breite Tabellen und Kalender scrollen im eigenen Bereich. Coarse-Pointer-Geräte
erhalten größere Kalender-/Heatmapzellen. Safe Areas und reduzierte Bewegung
werden berücksichtigt.

## Geprüfter Stand

- 51 Node-Tests bestanden; JavaScript-/EJS-Syntax und Compose validiert.
- Beide Themes und EN/DE: alle elf Ansichten bei
  320/390/620/768/800/801/1100/1440 Pixeln ohne horizontales Seitenscrollen.
- Startseite zusätzlich bei fünf Breiten; lange Song-/Künstler-/Albumnamen,
  Tablet-Vergleichskarten, Suchergebnisse und Detail-/Widget-/Navigationsdialoge.
- Axe WCAG A/AA: Startseite, alle Ansichten beider Themes/Sprachen und Dialoge
  ohne gemeldete Verstöße im geprüften Chromium.
- Native Dialog-Fokusbindung, Escape, Rückkehr zum Menüknopf,
  Größenwechsel bei geöffnetem Menü, angewendete Filter und Querformat.
- Theme- und Sprachwechsel erhalten die Auswertung. Neuladen verwirft
  Hördaten und stellt nur die beiden Einstellungen wieder her.
- Speicherblockierung, keine Hördatenrequests, keine Cookies/IndexedDB.
- Vergleichs-/Rückblicks-/CSV-/PDF-Regression in EN/DE bestanden.
- Isolierter Nginx-Build mit denselben Benutzer-/Read-only-/Ressourcenregeln
  bestanden; danach öffentliche HTTPS-Import-/Datenschutzregression und
  Touch-Smoke-Test erfolgreich. Veröffentlichte Assets bytegleich zum Build.

Browser: Playwright/Chromium mit synthetischen Hördaten, isolierte Kontexte.
Keine physische Telefon- oder Safari-Prüfung durchgeführt.

Tests: `tests/mobile-theme.acceptance.cjs` und
`tests/explorations.acceptance.cjs`. Voraussetzungen und Aufrufe stehen in README.
Ohne `TEST_BASE` startet der Acceptance-Test einen lokalen Vorschau-Server;
mit `TEST_BASE` kann ein eigener isolierter Dienst geprüft werden.
`ARTIFACTS` überschreibt das Ziel der Screenshots und des Ergebnisberichts.

Betreiberbezogene Deployment- und Recoveryunterlagen, rechtliche Footer,
Sicherungen und Produktionsartefakte bleiben außerhalb des Repositorys.
