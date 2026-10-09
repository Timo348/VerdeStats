# VerdeStats – Ausbauplan

Stand: 9. Oktober 2026. Diese Roadmap hält die ursprünglichen 75 Vorschläge und die dazu getroffenen Entscheidungen fest. Die Nummern entsprechen der ursprünglichen Vorschlagsliste. Sie ist ein Plan für weitere Arbeit, keine Behauptung, dass alle Funktionen bereits vorhanden sind.

## Verbindliche Grundlagen

- Spotify-JSON und ZIP-Dateien werden ausschließlich im Browser verarbeitet. Es gibt keine Upload- oder Analyse-API auf dem Server.
- Hörverlauf, Auswertung, Filter und Widget-Einstellungen bleiben im Arbeitsspeicher. Keine Speicherung dieser Daten in Local Storage, Session Storage, IndexedDB, Cookies oder auf dem Server; nach dem Neuladen wird erneut importiert.
- Ausschließlich die bewusst gewählte Sprache `en`/`de` und das Theme `modern`/`legacy` werden unter `verdestats-language` und `verdestats-theme` im Local Storage gespeichert (Theme auf Nutzerwunsch vom 09.10.2026 ergänzt). Englisch und Modern bleiben die Standards; neue Funktionen erhalten vollständige EN/DE-Texte.
- Keine Spotify-Anbindung, kein OAuth, keine Spotify-API und keine nachgeladenen Cover. Keine externen Schriftarten, Analysewerkzeuge oder Skripte.
- Gestaltung: dunkle GitHub-nahe Flächen, dezente grüne Akzente, klare Ränder, keine Pill-Buttons, möglichst wenig Schatten, Neon, Gradients oder Scroll-Effekte. Keine vagen Hero-Texte, Fake Reviews oder erfundenen Kennzahlen.
- Datenschutzprüfung der Anwendung und tatsächlicher Serverbetrieb sind getrennt. Hosting, Proxy, Protokolle, GeoIP-Verarbeitung sowie die öffentlichen Pflichtinformationen prüft und betreut der Betreiber. Die lokale Architektur ersetzt diese Prüfung nicht.

## Ausbaustand am 09.10.2026

Die 15 verbleibenden freigegebenen Funktionen **46–58, 61 und 62** sind umgesetzt.
Die bestehenden Punkte **11, 19, 71, 73 und 75** wurden dafür erweitert oder mit
neuen Regressionen abgesichert. Somit wurden 20 Planpunkte bearbeitet; 15 davon
sind neu umgesetzte Funktionen. Insgesamt umfasst die Lieferung 22 Arbeitspakete:
15 Funktionen plus Navigation, EN/DE, mobile Darstellung, Tastatur/WCAG,
Worker-/Datumsregressionen, Datenschutz-/Downloadprüfung und Deployment/Recovery.

- Vergleichs- und Rückblickformulare haben eigene Datumsgrenzen. Inhaltstyp und
  Mindesthördauer folgen den **angewendeten** Hauptfiltern. Sichtbare Ergebnisse
  und Downloads beziehen sich auf die zuletzt abgeschickten Einstellungen.
- Monatsränge: Top 10 nach Hörzeit pro aktivem Monat, als separate Verlaufsansicht.
  Dominanzphasen: mindestens 50 % Monats-Hörzeit und 10 Wiedergaben; direkt
  angrenzende Monate desselben dominierenden Künstlers werden zusammengefasst.
- Beständige Favoriten: mindestens 10 Wiedergaben in mindestens zwei Jahren,
  aus dem gesamten Archiv mit den angewendeten Inhalts-/Dauerfiltern.
- Kurze intensive Phasen: mindestens 10 Songwiedergaben in einer Montag–Sonntag-
  Woche und höchstens 20 % davon in den folgenden 28 Tagen. Das gesamte Folgefenster
  muss im gewählten Zeitraum und innerhalb der Archivgrenzen liegen. Archivlücken
  bleiben unbekannt; es wird kein nachgewiesener vollständiger Hörverlauf behauptet.
- Neue Musik zählt nur die erste archivierte Wiedergabe je Song. Eine erhöhte
  Mindesthördauer verschiebt dessen erste tatsächliche Archivwiedergabe nicht.
  „An diesem Tag“ verwendet frühere Jahre des ganzen Imports und ein wählbares Datum.
- Rückblicke zeigen reale Kennzahlen, Monatsbalken, Top 10 und Veränderungen zum
  vorherigen Jahr/Monat beziehungsweise zum vorherigen gleich langen Datumsfenster.
- CSV enthält die vollständige gewählte Song-/Künstler-/Album-/Tages-/Monatstabelle.
  PDF enthält bis zu 50 Einträge pro Rangliste (bei Rückblicken deren Top 10) sowie
  die letzten 24 aktiven Monate. PDF-Seiten werden lokal als Bilder eingebettet,
  um Browserzeichen zu erhalten; Text ist darin nicht suchbar oder markierbar.
  Lange Namen werden im PDF gekürzt. CSV bleibt für vollständige Namen verfügbar.

Nicht umgesetzt bleiben die ausdrücklich abgelehnten, entfernten und
zurückgestellten Funktionen. **59/60** warten weiter auf Prüfung und Entscheidung,
**63** bleibt zurückgestellt und **64** bleibt offen. Es gibt keine Spotify-
Anbindung, externen Cover oder dauerhafte Speicherung von Hördaten.

Nachweise und Betriebsgrenzen: [docs/AUSBAU-20261009.md](docs/AUSBAU-20261009.md).

## 1–10: Zuverlässige Auswertung und Import

| Nr. | Ursprünglicher Vorschlag | Status und verbindlicher Umfang |
| --- | --- | --- |
| 1 | Songs eindeutig unterscheiden | **Umgesetzt.** Spotify-ID, ersatzweise Titel und Künstler, statt Titel allein. |
| 2 | Alben eindeutig unterscheiden | **Umgesetzt.** Gleichnamige Alben unterschiedlicher Künstler werden getrennt. |
| 3 | Enddatum vollständig einschließen | **Umgesetzt.** Der vollständige ausgewählte Endtag gehört zum Zeitraum. |
| 4 | Zeitzone auswählen | **Abgelehnt.** Kein Zeitzonenwähler. Die Anwendung verwendet die lokale Zeitzone des Browsers. |
| 5 | Musik und Podcasts trennen | **Umgesetzt.** Inhaltstypen und passende Statistiken sind getrennt auswählbar. |
| 6 | Leere Ergebnisse korrekt anzeigen | **Umgesetzt.** Keine erfundenen Spitzenwerte bei fehlenden Streams. |
| 7 | Doppelte Streams erkennen | **Umgesetzt.** Überlappende Exportdateien werden bei der lokalen Normalisierung dedupliziert. |
| 8 | ZIP-Unterordner automatisch durchsuchen | **Umgesetzt.** Unterstützte JSON-Dateien werden auch in verschachtelten ZIP-Verzeichnissen erkannt. |
| 9 | Importbericht anzeigen | **Abgelehnt.** Kein ausführlicher Diagnosebericht. Notwendige Import- und Fehlermeldungen bleiben vorhanden. |
| 10 | Dateibasierten Startzeitraum wählen | **Umgesetzt.** Der erste Zeitraum umfasst den vorhandenen importierten Verlauf. |

## 11–20: Oberfläche und Bedienung

| Nr. | Ursprünglicher Vorschlag | Status und verbindlicher Umfang |
| --- | --- | --- |
| 11 | Navigation nach Bereichen | **Umgesetzt.** Übersicht, Ranglisten, Hörverhalten und Daten sind über die Navigation erreichbar. Am 09.10.2026 um Vergleiche, Entdeckungen, Rückblicke und Exporte erweitert. |
| 12 | Ruhigere Farbgestaltung | **Umgesetzt und überarbeitet.** Dunkles GitHub-nahes Farbsystem mit grünen Akzenten; die zwischenzeitliche graue Gestaltung wurde ersetzt. |
| 13 | Kompakte Filterleiste | **Umgesetzt.** Zeitraum, Inhaltstyp und Mindesthördauer sind kompakt erreichbar. |
| 14 | Zeitraum-Vorlagen | **Umgesetzt.** Gesamter Verlauf, Jahr, Monat und eigene Datumsgrenzen. |
| 15 | Mindesthörzeit in Sekunden | **Umgesetzt.** Bedienung in verständlichen Sekundenwerten. |
| 16 | Dashboard direkt nach dem Import öffnen | **Umgesetzt.** Nach erfolgreichem Import wird automatisch ausgewertet und die Übersicht geöffnet. |
| 17 | Globale Suche | **Umgesetzt und verbessert.** Songs, Künstler und Alben; toleriert Apostrophe, Akzente und unterschiedliche Wortreihenfolgen. |
| 18 | Klickbare Diagramme | **Umgesetzt.** Zeiträume lassen sich direkt aus Diagrammen auswählen; Infoboxen zeigen passende lokale Statistiken. |
| 19 | Mobile Ansichten gezielt gestalten | **Umgesetzt.** Angepasste Navigation, Ranglisten, Filter und begrenzte Scrollbereiche für breite Diagramme. Neue Ausbaubereiche am 09.10.2026 in EN/DE bei 320, 390, 768 und 1440 Pixeln geprüft; lange Rückblicknamen umbrechen. |
| 20 | Dashboard anpassen | **Umgesetzt mit bewusster Einschränkung.** Widgets auswählen und umordnen; Einstellungen gelten ausschließlich während der geöffneten Seite. Dauerhaftes Speichern ist ausgeschlossen. |

## 21–30: Songs, Künstler und Alben

| Nr. | Ursprünglicher Vorschlag | Status und verbindlicher Umfang |
| --- | --- | --- |
| 21 | Vollständige Ranglisten | **Umgesetzt.** Suche und Seitenwechsel für Songs, Künstler und Alben. Übersichtskarten zeigen kompakte Top 7 ohne große Leerflächen. |
| 22 | Sortierung nach Hörzeit oder Wiedergaben | **Umgesetzt.** Ergänzend ist eine Sortierung nach Namen möglich. |
| 23 | Song-Detailseite | **Umgesetzt.** Hörzeit, Wiedergaben, erste und letzte importierte Wiedergabe sowie zeitlicher Verlauf. |
| 24 | Künstler-Detailseite | **Umgesetzt.** Zugehörige Songs und Alben, zeitlicher Verlauf und Anteil an der Hörzeit. |
| 25 | Album-Detailseite | **Umgesetzt.** Enthaltene Tracks und deren Hörverteilung innerhalb des Imports. |
| 26 | Rangveränderungen anzeigen | **Nachträglich ausdrücklich entfernt.** Keine „Change“-Spalte, Vorher-Ränge oder Auf-/Absteiger-Markierungen in den aktuellen Ranglisten. Künftige separate Zeitraumvergleiche nach 46/47 bleiben freigegeben. |
| 27 | Neue Künstler entdecken | **Nachträglich ausdrücklich entfernt.** Kein „First in Import“/„Erstmals im Import“-Badge und kein entsprechender Listenfilter. Erste und letzte Wiedergabe bleiben sachliche Angaben in den Details. |
| 28 | Vergessene Favoriten | **Nachträglich ausdrücklich entfernt.** Kein „Forgotten Favorites“-/„Vergessene Favoriten“-Widget, Listenfilter oder entsprechende Auswertung mehr. |
| 29 | Comebacks | **Nachträglich ausdrücklich entfernt.** Keine Comeback-Karte, Kennzeichnung oder Auswertung mehr. |
| 30 | Persönliche Meilensteine | **Umgesetzt.** Wiedergabe- und Hörzeitmeilensteine aus dem importierten Verlauf. |

## 31–45: Hörverhalten und Diagramme

| Nr. | Ursprünglicher Vorschlag | Status und verbindlicher Umfang |
| --- | --- | --- |
| 31 | Kalender-Heatmap | **Umgesetzt.** Tage zeigen Höraktivität; Infoboxen enthalten Datum, Hörzeit, Wiedergaben und verfügbare Top-Songs/Künstler. |
| 32 | Wochentag-Uhrzeit-Heatmap | **Umgesetzt und verbessert.** Beschriftete Tage und Stunden; Hover-/Fokus-Infoboxen mit Hörzeit, Wiedergaben und Top 3 Songs/Künstlern. |
| 33 | Tages-, Wochen-, Monats- und Jahresansicht | **Umgesetzt.** Umschaltbare Hörzeit-Timeline mit Infoboxen für den jeweiligen Zeitraum. |
| 34 | Anzahl unterschiedlicher Songs und Künstler | **Umgesetzt.** Vielfalt für den gewählten Zeitraum. |
| 35 | Hörtage und täglicher Durchschnitt | **Umgesetzt.** Aktive Tage und Durchschnitt über alle beziehungsweise aktive Tage. |
| 36 | Längste Hörserie | **Umgesetzt.** Aufeinanderfolgende aktive Hörtage im lokalen Verlauf. |
| 37 | Rekordtage | **Umgesetzt.** Spitzenwerte für Hörzeit und Songvielfalt. |
| 38 | Hörsessions erkennen | **Umgesetzt.** Zusammenhängende Wiedergaben anhand einer nachvollziehbaren Pausenregel. |
| 39 | Wiederholungsphasen | **Umgesetzt.** Intensiv wiederholte Songs innerhalb eines Tages oder einer Woche. |
| 40 | Konzentration auf Favoriten | **Umgesetzt.** Hörzeitanteile der Top 5 und Top 10. |
| 41 | Shuffle-Anteil | **Umgesetzt.** Verfügbare Shuffle-Angaben; unbekannte Werte werden berücksichtigt. |
| 42 | Skip-Auswertung | **Umgesetzt.** Skip-Anteil und unbekannte Angaben werden getrennt behandelt. |
| 43 | Offline-Anteil | **Umgesetzt.** Auswertung verfügbarer Offline-Angaben mit sichtbaren unbekannten Werten. |
| 44 | Gerätevergleich | **Umgesetzt.** Verständliche Gruppierung der importierten Plattformangaben. |
| 45 | Länderansicht | **Umgesetzt.** Hörzeit nach Länderkennung; keine Ableitung genauer Reiseorte. |

## 46–55: Zeitvergleiche und persönliche Entdeckungen

| Nr. | Ursprünglicher Vorschlag | Status und geplanter Umfang |
| --- | --- | --- |
| 46 | Jahr gegen Jahr vergleichen | **Umgesetzt am 09.10.2026.** Zwei importierte Jahre mit Hörzeit, Wiedergaben, Favoriten und Archivabdeckung vergleichen. |
| 47 | Zwei beliebige Zeiträume gegenüberstellen | **Umgesetzt am 09.10.2026.** Frei wählbare lokale Zeitfenster; unterschiedliche Längen und fehlende Importabdeckung sichtbar machen. |
| 48 | Monatliche Künstler-Rangverläufe | **Umgesetzt am 09.10.2026.** Favoritenentwicklung über Monate als separate Verlaufsansicht. |
| 49 | Musikalische Phasen | **Umgesetzt am 09.10.2026.** Abschnitte mit dominierenden Künstlern anhand erklärter Regeln zeigen. Keine sensiblen Persönlichkeitsmerkmale ableiten. |
| 50 | Neue Musik gegenüber Wiederholungen | **Umgesetzt am 09.10.2026.** Aggregierter Anteil erstmals im vorhandenen Archiv gehörter Songs. „Neu“ bezeichnet keine nachweislich erste Wiedergabe außerhalb des Imports; entfernte Import-Badges bleiben ausgeschlossen. |
| 51 | Beständige Favoriten | **Umgesetzt am 09.10.2026.** Künstler mit regelmäßiger Aktivität über mehrere importierte Jahre. |
| 52 | Kurzzeitige Obsessionen | **Umgesetzt am 09.10.2026.** Kurze, intensive Hörphasen mit anschließend geringer Aktivität, mit nachvollziehbaren Schwellenwerten. |
| 53 | „An diesem Tag“ | **Umgesetzt am 09.10.2026.** Songs und Künstler am gleichen Kalenderdatum in früheren importierten Jahren. |
| 54 | Tageszeit-Favoriten | **Umgesetzt am 09.10.2026.** Favoriten für morgens, tagsüber, abends und nachts in der Browser-Zeitzone. |
| 55 | Werktage gegenüber Wochenende | **Umgesetzt am 09.10.2026.** Montag–Freitag gegenüber Samstag/Sonntag nach Hörzeit, Favoriten und Wiederholungen vergleichen. |

## 56–65: Rückblicke, Export und Teilen

| Nr. | Ursprünglicher Vorschlag | Status und geplanter Umfang |
| --- | --- | --- |
| 56 | Eigener Jahresrückblick | **Umgesetzt am 09.10.2026.** Rückblick für jedes importierte Jahr mit tatsächlichen Kennzahlen, Favoriten und Diagrammen. |
| 57 | Monatsrückblick | **Umgesetzt am 09.10.2026.** Monatsfavoriten, Veränderungen und Entdeckungen als eigener Rückblick, ohne entfernte Import-Badges in Ranglisten. |
| 58 | Rückblick für beliebige Zeiträume | **Umgesetzt am 09.10.2026.** Eigene Datumsbereiche mit frei gewähltem Namen; Name und Ergebnis bleiben im Arbeitsspeicher. |
| 59 | Teilbare Statistikkarten als PNG | **Zunächst prüfen.** Datenschutz und Nutzungsrechte vor Umsetzung bewerten. Falls freigegeben: Angaben bewusst auswählen und PNG ausschließlich lokal herunterladen; keine öffentliche Galerie, Uploads oder externen Cover. Teilen außerhalb der Anwendung liegt beim Nutzer. |
| 60 | Poster deiner Top-Songs oder Künstler | **Zunächst prüfen.** Datenschutz und Nutzungsrechte für Inhalte und Gestaltung klären. Falls freigegeben: schlichte lokale Poster-Downloads aus ausgewählten Angaben, ohne Remote-Cover oder öffentliche Veröffentlichung durch die Anwendung. |
| 61 | PDF-Bericht | **Umgesetzt am 09.10.2026.** Diagramme und Ranglisten lokal als PDF erzeugen und bewusst herunterladen. Keine serverseitige Erstellung oder Speicherung. |
| 62 | CSV-Export | **Umgesetzt am 09.10.2026.** Ausgewählte Auswertungstabellen lokal herunterladen; unnötige personenbezogene Originalfelder ausschließen und Tabelleninhalte sicher exportieren. |
| 63 | Vergleich zweier Profile | **Zurückgestellt, im Hinterkopf behalten.** Noch nicht umsetzen. Eine spätere Entscheidung müsste bewusste Bereitstellung beider Datensätze und weiterhin rein lokale Verarbeitung festlegen. |
| 64 | Playlist-Vorschläge aus deinem Verlauf | **Offene Entscheidung, nicht freigegeben.** Noch keine Antwort auf diesen Vorschlag. Vor Umsetzung klären, ob reine lokale Vorschlagslisten gewünscht sind. Keine automatische Spotify-Übertragung. |
| 65 | Optionale Spotify-Anbindung | **Ausdrücklich ausgeschlossen.** Für den aktuellen Plan dauerhaft weglassen: kein OAuth, keine Spotify-API, keine extern geladenen Cover und keine Playlist-Übertragung an Spotify. |

## 66–75: Datenhaltung, Datenschutz und technische Basis

| Nr. | Ursprünglicher Vorschlag | Status und verbindlicher Umfang |
| --- | --- | --- |
| 66 | Dauerhaftes lokales Archiv | **Abgelehnt.** Kein dauerhaft gespeicherter Hörverlauf; Dateien werden pro Sitzung bewusst erneut ausgewählt. |
| 67 | Neue Exporte ergänzend importieren | **Abgelehnt.** Kein inkrementelles Archiv und keine dauerhafte Zusammenführung über Sitzungen hinweg. Mehrere gemeinsam ausgewählte Dateien innerhalb eines Imports bleiben unterstützt. |
| 68 | Mehrere getrennte Profile | **Abgelehnt.** Keine Konten, Serverprofile oder dauerhaft gespeicherten Profildaten. |
| 69 | Optionaler Modus zur Analyse im Browser | **Ursprünglicher optionaler Hybridmodus abgelehnt; spätere Browser-Architektur verbindlich umgesetzt.** Es gibt ausschließlich browserlokale Analyse, keinen umschaltbaren Servermodus. Verlaufsdateien verlassen das Gerät nicht. |
| 70 | Datenverwaltung mit Löschen und Speicheranzeige | **Erweiterte Datenverwaltung abgelehnt.** Kein Archiv- oder Speichermanager. Das bereits vorhandene „Daten verwerfen“ bleibt zum Zurücksetzen der aktuellen Sitzung erhalten. |
| 71 | IP-Adressen und unnötige personenbezogene Felder beim Import verwerfen | **Bestätigt und umgesetzt.** Allowlist bei der Normalisierung verwirft insbesondere Benutzernamen, historische IP-Adressen, User-Agent-Werte und beliebige zusätzliche Originalfelder. Die ursprüngliche ausgewählte Datei wird lokal gelesen und bleibt auf dem Gerät unverändert. Neue Analysen und Exporte übernehmen ebenfalls keine IP-, Benutzername- oder User-Agent-Felder; Regressionstests und Browserprüfung am 09.10.2026 bestätigen dies. |
| 72 | Sichere Upload-Verarbeitung | **Nachträglich bestätigt und angemessen umgesetzt, angepasst an den lokalen Import.** Keine Serveruploads oder Upload-Sitzungen. Dateitypprüfung, begrenzte ZIP-Verarbeitung, sichere Behandlung von Einträgen und Fehlern erfolgen im Browser; normale Spotify-Exporte sollen praktikabel bleiben. |
| 73 | Import im Hintergrund mit Fortschritt | **Bestätigt und umgesetzt.** Browser-Worker verarbeitet den Import mit Fortschrittsanzeige, damit die Oberfläche bedienbar bleibt. Auch Zeitraumvergleiche, Rückblicke und neue Musterberechnungen laufen seit 09.10.2026 im Worker. |
| 74 | Ergebnisse zwischenspeichern und indexieren | **Abgelehnt als zusätzliche Cache-/Index-Funktion.** Keine permanent gespeicherten Ergebnisse oder Indizes. Flüchtige normalisierte Laufzeitdaten und Aggregationen im Arbeitsspeicher für Filter und Anzeige sind notwendiger Bestandteil der aktuellen Browser-Auswertung. |
| 75 | Solide Releases | **Bestätigt und umgesetzt.** Festgelegte Abhängigkeiten mit Lockfile, lokal ausgelieferte Assets, statischer Build, Docker-Konfiguration und GitHub-CI. Nach dem Ausbau am 09.10.2026 bestehen 51 Tests; EN/DE-Browserabnahme, lokale Downloads und WCAG A/AA der neuen Inhalte wurden geprüft. Ein erfolgreicher CI-Lauf nach einem GitHub-Push ist erst nach dessen tatsächlichem Abschluss bestätigt. |

## Abnahmekriterien für weitere Funktionen

- Ergebnisse beruhen ausschließlich auf dem aktuell importierten Datensatz und dem gewählten Zeitraum. Fehlende Daten und die Grenzen der Archivabdeckung werden verständlich gekennzeichnet.
- Neue Ansichten funktionieren auf kleinen Bildschirmen, mit Tastatur und in beiden Sprachen. Diagramme erhalten verständliche Beschriftungen und passende Infoboxen.
- Exporte entstehen bewusst als lokale Dateien. Die Anwendung veröffentlicht nichts automatisch und lädt keine Auswertungen oder Quelldateien hoch.
- Keine Erweiterung führt Accounts, dauerhafte Hördatenspeicherung, Telemetrie, externe Medien oder Spotify-Anbindung stillschweigend wieder ein.
- Für abgelehnte oder noch nicht freigegebene Punkte ist vor einer Änderung der jeweiligen Entscheidung eine ausdrückliche neue Freigabe nötig.

Technischer Datenschutzstand: [docs/DATENSCHUTZ-PRUEFUNG.md](docs/DATENSCHUTZ-PRUEFUNG.md). Details der bisherigen Umsetzung: [docs/UMSETZUNG.md](docs/UMSETZUNG.md).

## Mobile und Legacy-Theme (09.10.2026)

Mobilmenü mit allen elf Bereichen, einklappbare Filter, größere Touchflächen und Eingabetexte, bessere Tabellen-/Dialog-/Statistiklayouts. Modern/Legacy-Schalter neben EN/DE; Legacy führt die ursprüngliche Schwarz-/Neon-Grün-Palette, grüne Buttons und Statistikränder durch alle Ansichten fort. Technische Umsetzung und Prüfungen: [MOBILE-THEME-20261009.md](docs/MOBILE-THEME-20261009.md).
