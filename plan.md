# VerdeStats – Ausbauplan

Stand: 8. Oktober 2026. Diese Roadmap hält die ursprünglichen 75 Vorschläge und die dazu getroffenen Entscheidungen fest. Die Nummern entsprechen der ursprünglichen Vorschlagsliste. Sie ist ein Plan für weitere Arbeit, keine Behauptung, dass alle Funktionen bereits vorhanden sind.

## Verbindliche Grundlagen

- Spotify-JSON und ZIP-Dateien werden ausschließlich im Browser verarbeitet. Es gibt keine Upload- oder Analyse-API auf dem Server.
- Hörverlauf, Auswertung, Filter und Widget-Einstellungen bleiben im Arbeitsspeicher. Keine Speicherung dieser Daten in Local Storage, Session Storage, IndexedDB, Cookies oder auf dem Server; nach dem Neuladen wird erneut importiert.
- Ausschließlich die bewusst gewählte Sprache `en` oder `de` wird unter `verdestats-language` im Local Storage gespeichert. Englisch bleibt die Standardsprache; neue Funktionen erhalten vollständige EN/DE-Texte.
- Keine Spotify-Anbindung, kein OAuth, keine Spotify-API und keine nachgeladenen Cover. Keine externen Schriftarten, Analysewerkzeuge oder Skripte.
- Gestaltung: dunkle GitHub-nahe Flächen, dezente grüne Akzente, klare Ränder, keine Pill-Buttons, möglichst wenig Schatten, Neon, Gradients oder Scroll-Effekte. Keine vagen Hero-Texte, Fake Reviews oder erfundenen Kennzahlen.
- Datenschutzprüfung der Anwendung und tatsächlicher Serverbetrieb sind getrennt. Hosting, Proxy, Protokolle, GeoIP-Verarbeitung sowie die öffentlichen Pflichtinformationen prüft und betreut der Betreiber. Die lokale Architektur ersetzt diese Prüfung nicht.

## Nächste Ausbaustufen

1. **Zeitvergleiche und Entdeckungen (46–55):** separate Vergleichsansichten und nachvollziehbare Analysen auf den bereits lokal importierten Daten. Keine dauerhafte Speicherung und keine Rückkehr der entfernten Rangänderungsspalte, Import-Badges oder Comebacks.
2. **Rückblicke (56–58):** Jahres-, Monats- und frei benannte Zeitraumrückblicke aus tatsächlichen Daten. Veränderungen und Entdeckungen beziehen sich auf die Abdeckung des importierten Archivs.
3. **Lokale Exporte (61–62):** PDF und CSV zum bewussten Herunterladen auf das eigene Gerät.
4. **Bildkarten und Poster (59–60):** erst Datenschutz und Nutzungsrechte prüfen, anschließend gegebenenfalls lokale Downloads ohne öffentliche Galerie oder Remote-Cover umsetzen.
5. **Playlist-Vorschläge (64):** zunächst die noch offene Produktentscheidung klären. Keine Umsetzung ohne Freigabe und keine Spotify-Übertragung.

Punkt 63 bleibt für später vorgemerkt. Abgelehnte Funktionen bleiben ausgeschlossen. Der Tippfehler „81 Nein“ wird ignoriert und bildet keinen zusätzlichen Punkt.

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
| 11 | Navigation nach Bereichen | **Umgesetzt.** Übersicht, Ranglisten, Hörverhalten und Daten sind über die Navigation erreichbar. Weitere Bereiche werden mit den zugehörigen Funktionen ergänzt. |
| 12 | Ruhigere Farbgestaltung | **Umgesetzt und überarbeitet.** Dunkles GitHub-nahes Farbsystem mit grünen Akzenten; die zwischenzeitliche graue Gestaltung wurde ersetzt. |
| 13 | Kompakte Filterleiste | **Umgesetzt.** Zeitraum, Inhaltstyp und Mindesthördauer sind kompakt erreichbar. |
| 14 | Zeitraum-Vorlagen | **Umgesetzt.** Gesamter Verlauf, Jahr, Monat und eigene Datumsgrenzen. |
| 15 | Mindesthörzeit in Sekunden | **Umgesetzt.** Bedienung in verständlichen Sekundenwerten. |
| 16 | Dashboard direkt nach dem Import öffnen | **Umgesetzt.** Nach erfolgreichem Import wird automatisch ausgewertet und die Übersicht geöffnet. |
| 17 | Globale Suche | **Umgesetzt und verbessert.** Songs, Künstler und Alben; toleriert Apostrophe, Akzente und unterschiedliche Wortreihenfolgen. |
| 18 | Klickbare Diagramme | **Umgesetzt.** Zeiträume lassen sich direkt aus Diagrammen auswählen; Infoboxen zeigen passende lokale Statistiken. |
| 19 | Mobile Ansichten gezielt gestalten | **Umgesetzt.** Angepasste Navigation, Ranglisten, Filter und begrenzte Scrollbereiche für breite Diagramme. |
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
| 28 | Vergessene Favoriten | **Umgesetzt.** Früher häufig gehörte Inhalte mit längerer Hörpause innerhalb des vorhandenen Archivs. |
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
| 46 | Jahr gegen Jahr vergleichen | **Bestätigt, geplant.** Zwei importierte Jahre mit Hörzeit, Wiedergaben, Favoriten und Archivabdeckung vergleichen. |
| 47 | Zwei beliebige Zeiträume gegenüberstellen | **Bestätigt, geplant.** Frei wählbare lokale Zeitfenster; unterschiedliche Längen und fehlende Importabdeckung sichtbar machen. |
| 48 | Monatliche Künstler-Rangverläufe | **Bestätigt, geplant.** Favoritenentwicklung über Monate als separate Verlaufsansicht. |
| 49 | Musikalische Phasen | **Bestätigt, geplant.** Abschnitte mit dominierenden Künstlern anhand erklärter Regeln zeigen. Keine sensiblen Persönlichkeitsmerkmale ableiten. |
| 50 | Neue Musik gegenüber Wiederholungen | **Bestätigt, geplant.** Aggregierter Anteil erstmals im vorhandenen Archiv gehörter Songs. „Neu“ bezeichnet keine nachweislich erste Wiedergabe außerhalb des Imports; entfernte Import-Badges bleiben ausgeschlossen. |
| 51 | Beständige Favoriten | **Bestätigt, geplant.** Künstler mit regelmäßiger Aktivität über mehrere importierte Jahre. |
| 52 | Kurzzeitige Obsessionen | **Bestätigt, geplant.** Kurze, intensive Hörphasen mit anschließend geringer Aktivität, mit nachvollziehbaren Schwellenwerten. |
| 53 | „An diesem Tag“ | **Bestätigt, geplant.** Songs und Künstler am gleichen Kalenderdatum in früheren importierten Jahren. |
| 54 | Tageszeit-Favoriten | **Bestätigt, geplant.** Favoriten für morgens, tagsüber, abends und nachts in der Browser-Zeitzone. |
| 55 | Werktage gegenüber Wochenende | **Bestätigt, geplant.** Montag–Freitag gegenüber Samstag/Sonntag nach Hörzeit, Favoriten und Wiederholungen vergleichen. |

## 56–65: Rückblicke, Export und Teilen

| Nr. | Ursprünglicher Vorschlag | Status und geplanter Umfang |
| --- | --- | --- |
| 56 | Eigener Jahresrückblick | **Bestätigt, geplant.** Rückblick für jedes importierte Jahr mit tatsächlichen Kennzahlen, Favoriten und Diagrammen. |
| 57 | Monatsrückblick | **Bestätigt, geplant.** Monatsfavoriten, Veränderungen und Entdeckungen als eigener Rückblick, ohne entfernte Import-Badges in Ranglisten. |
| 58 | Rückblick für beliebige Zeiträume | **Bestätigt, geplant.** Eigene Datumsbereiche mit frei gewähltem Namen; Name und Ergebnis bleiben im Arbeitsspeicher. |
| 59 | Teilbare Statistikkarten als PNG | **Zunächst prüfen.** Datenschutz und Nutzungsrechte vor Umsetzung bewerten. Falls freigegeben: Angaben bewusst auswählen und PNG ausschließlich lokal herunterladen; keine öffentliche Galerie, Uploads oder externen Cover. Teilen außerhalb der Anwendung liegt beim Nutzer. |
| 60 | Poster deiner Top-Songs oder Künstler | **Zunächst prüfen.** Datenschutz und Nutzungsrechte für Inhalte und Gestaltung klären. Falls freigegeben: schlichte lokale Poster-Downloads aus ausgewählten Angaben, ohne Remote-Cover oder öffentliche Veröffentlichung durch die Anwendung. |
| 61 | PDF-Bericht | **Bestätigt, geplant.** Diagramme und Ranglisten lokal als PDF erzeugen und bewusst herunterladen. Keine serverseitige Erstellung oder Speicherung. |
| 62 | CSV-Export | **Bestätigt, geplant.** Ausgewählte Auswertungstabellen lokal herunterladen; unnötige personenbezogene Originalfelder ausschließen und Tabelleninhalte sicher exportieren. |
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
| 71 | IP-Adressen und unnötige personenbezogene Felder beim Import verwerfen | **Bestätigt und umgesetzt.** Allowlist bei der Normalisierung verwirft insbesondere Benutzernamen, historische IP-Adressen, User-Agent-Werte und beliebige zusätzliche Originalfelder. Die ursprüngliche ausgewählte Datei wird lokal gelesen und bleibt auf dem Gerät unverändert. |
| 72 | Sichere Upload-Verarbeitung | **Nachträglich bestätigt und angemessen umgesetzt, angepasst an den lokalen Import.** Keine Serveruploads oder Upload-Sitzungen. Dateitypprüfung, begrenzte ZIP-Verarbeitung, sichere Behandlung von Einträgen und Fehlern erfolgen im Browser; normale Spotify-Exporte sollen praktikabel bleiben. |
| 73 | Import im Hintergrund mit Fortschritt | **Bestätigt und umgesetzt.** Browser-Worker verarbeitet den Import mit Fortschrittsanzeige, damit die Oberfläche bedienbar bleibt. |
| 74 | Ergebnisse zwischenspeichern und indexieren | **Abgelehnt als zusätzliche Cache-/Index-Funktion.** Keine permanent gespeicherten Ergebnisse oder Indizes. Flüchtige normalisierte Laufzeitdaten und Aggregationen im Arbeitsspeicher für Filter und Anzeige sind notwendiger Bestandteil der aktuellen Browser-Auswertung. |
| 75 | Solide Releases | **Bestätigt und umgesetzt.** Festgelegte Abhängigkeiten mit Lockfile, lokal ausgelieferte Assets, statischer Build, Docker-Konfiguration und vorbereitete GitHub-CI. 35 Tests waren vor der letzten reinen Farbanpassung bestanden; für diese Anpassung wurden auf Wunsch keine neuen Tests ausgeführt. Ein erfolgreicher CI-Lauf nach dem GitHub-Push ist erst nach dessen tatsächlichem Abschluss bestätigt. |

## Abnahmekriterien für weitere Funktionen

- Ergebnisse beruhen ausschließlich auf dem aktuell importierten Datensatz und dem gewählten Zeitraum. Fehlende Daten und die Grenzen der Archivabdeckung werden verständlich gekennzeichnet.
- Neue Ansichten funktionieren auf kleinen Bildschirmen, mit Tastatur und in beiden Sprachen. Diagramme erhalten verständliche Beschriftungen und passende Infoboxen.
- Exporte entstehen bewusst als lokale Dateien. Die Anwendung veröffentlicht nichts automatisch und lädt keine Auswertungen oder Quelldateien hoch.
- Keine Erweiterung führt Accounts, dauerhafte Hördatenspeicherung, Telemetrie, externe Medien oder Spotify-Anbindung stillschweigend wieder ein.
- Für abgelehnte oder noch nicht freigegebene Punkte ist vor einer Änderung der jeweiligen Entscheidung eine ausdrückliche neue Freigabe nötig.

Technischer Datenschutzstand: [docs/DATENSCHUTZ-PRUEFUNG.md](docs/DATENSCHUTZ-PRUEFUNG.md). Details der bisherigen Umsetzung: [docs/UMSETZUNG.md](docs/UMSETZUNG.md).
