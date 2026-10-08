# VerdeStats: erste Ausbaustufe

Umgesetzt am 8. Oktober 2026: die freigegebenen Punkte 1–45. Punkt 4 (Zeitzonenauswahl) und Punkt 9 (Import-Diagnosebericht) bleiben ausgeschlossen. Punkt 65 (Spotify-Anbindung) wird ebenfalls nicht eingebaut. Punkte ab 46 sind noch nicht Teil dieser Lieferung. In den anschließenden Oberflächenrunden wurden vergessene Favoriten, Comebacks, „Erstmals im Import“ und die Vergleichsspalte auf Wunsch entfernt.

## Was du jetzt ausprobieren kannst

- JSON-Dateien oder ZIP mit Unterordnern öffnen; überlappende Exporte werden dedupliziert. Die erste Auswertung erscheint automatisch für den gesamten importierten Zeitraum.
- Jahr, Monat, eigene Datumsgrenzen, Mindesthördauer und Musik/Podcasts wählen. Das Enddatum ist vollständig eingeschlossen; alle Zeitangaben folgen der Browser-Zeitzone.
- Vollständige Song-, Künstler- und Albumlisten durchsuchen, sortieren und seitenweise öffnen. Die Suche toleriert Apostrophe, Akzente und unterschiedliche Wortreihenfolgen; globale Treffer sind nach Relevanz geordnet. Details zeigen Hörzeit, Wiedergaben, erste/letzte importierte Wiedergabe, Monatsverlauf, Hörzeitanteil und zugehörige Tracks.
- Persönliche Meilensteine erkunden. Die Ranglisten zeigen den aktuellen Zeitraum ohne Vergleichsspalte, Import-Badges oder Filter für vergessene Favoriten.
- Heatmap-Zellen, Tageskalender und Zeitdiagramme mit Maus oder Tastatur erkunden: Infoboxen zeigen Hörzeit, Wiedergaben und die Top 3 Songs/Künstler im gewählten Bereich. Tageskalender und Zeitdiagramme anklicken, zwischen Tag/Woche/Monat/Jahr wechseln und Hörserien, Rekordtage, Vielfalt, Sessions und Wiederholungsphasen ansehen.
- Wochentag-/Stunden-Heatmap, Skip-/Shuffle-/Offline-Anteile, Geräte, Länderkennungen und Konzentration auf die Top 5/10 ansehen. Unbekannte Werte werden sichtbar berücksichtigt.
- Kompakte Top-7-Widgets im GitHub-Dark-Farbthema ein-/ausblenden und verschieben, EN/DE umschalten und die mobile Navigation benutzen. Widget-Einstellungen gelten nur während der geöffneten Seite.
- Mit „Daten verwerfen“ die gesamte Auswertung zurücksetzen. Ein Neuladen startet ebenfalls ohne Hördaten.

## Datenschutz bleibt Teil der Architektur

Dateien und Ergebnisse bleiben lokal im Browser. Die Anwendung hat keine Upload-API, setzt keine Cookies und lädt keine externen Skripte, Schriften oder Bilder. Nur die ausdrücklich gewählte Sprache wird unter `verdestats-language` gespeichert. Der ausführliche [Datenschutzbericht](DATENSCHUTZ-PRUEFUNG.md) beschreibt die technische Prüfung und die getrennte spätere Prüfung deiner öffentlichen Serverkonfiguration.

## Nachweise

34 automatisierte Tests bestanden, JavaScript-/EJS-Prüfung und statischer Build erfolgreich. Der bisherige Test für vergessene Favoriten entfällt; der DTO-Test bestätigt die Entfernung. Die frühere Abhängigkeitsprüfung meldete keine Schwachstellen. Docker-Build und Nginx-Konfiguration geprüft; der lokale Container ist gesund. GET und lokale Assets liefern HTTP 200, Upload-Versuche HTTP 405, keine `Set-Cookie`-Header; die CSP sperrt Anwendungs-Netzwerkanfragen mit `connect-src 'none'`.

Manuell im Browser geprüft: JSON- und verschachtelter ZIP-Import, 65 Songs über vier Ranglistenseiten, Suche/Sortierung, als Text dargestellte HTML-Inhalte, Song-/Künstler-/Albumdetails, vollständiger Endtag, Februar mit 29 Tagen, Kalenderfilter, Podcast-Auswertung, leere Filterergebnisse, deutsche Texte, Widget-Reihenfolge, Verwerfen und Smartphone-Ansicht bei 390 Pixeln. Keine Fehler in der Browserkonsole.

Die Beispieldatei im Repository ist synthetisch. Es wurden keine persönlichen Spotify-Dateien verwendet. Die öffentliche Seite wird separat vom Betreiber bereitgestellt; ein GitHub-Push aktualisiert sie nicht automatisch. Die vollständige ursprüngliche Vorschlagsliste mit Freigaben, offenen Erweiterungen und späteren Ausschlüssen steht in [plan.md](../plan.md).

## Start und Bereitstellung

Lokale Vorschau: `http://localhost:30008/`.

Im Repository: `docker compose up -d --build`. Alternativ mit Node.js 24: `npm ci --ignore-scripts` und `npm start`.

Für deine vorhandene statische Seite die Inhalte von `dist/` beziehungsweise dem bereitgestellten statischen ZIP übernehmen. Die mitgelieferte `nginx.conf` zeigt die benötigten Sicherheitsheader. Die Einstellungen vorgeschalteter Proxys und Logs prüfst du separat.
