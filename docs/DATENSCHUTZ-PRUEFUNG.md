# Datenschutzprüfung: VerdeStats als Browser-Anwendung

Stand: **8. Oktober 2026**. Umfang: freigegebene Funktionen 1–45, ohne Zeitzonen-Auswahl und Importbericht. Impressum und Datenschutzerklärung ergänzt der Betreiber serverseitig. Spotify-API, Cover, öffentliche Ergebnislinks, Konten, dauerhafte Archive und Exporte gehören nicht zu dieser Ausbaustufe.

**Ergebnis:** Die vorhandene Browser-Architektur wird erhalten. Nutzer wählen Dateien auf ihrem Gerät; ein lokaler Web Worker verarbeitet JSON beziehungsweise ZIP und liefert Ergebnisse an die Oberfläche im selben Browser. Neue Diagramme und persönliche Entdeckungen benötigen keine Übertragung der Hördateien. Das frühere Server-Upload-Konzept aus GitHub-main ist nicht die Grundlage dieser Prüfung.

**Prüfstatus:** Die bisherige [Live-Anwendung](https://verdestats.timolab.de/) wurde anhand ihrer ausgelieferten Skripte und HTTP-Antwort geprüft. Die erweiterte lokale Fassung wurde gebaut und mit **35 bestandenen Tests** geprüft. Ihre statische Nginx-Auslieferung weist Upload-Versuche mit HTTP 405 zurück, setzt keine Sitzungscookies und liefert eine Content-Security-Policy mit `connect-src 'none'`. Quellcode und unabhängige Prüfung bestätigen die nachfolgend beschriebenen lokalen Datenflüsse. Hosting-Konfiguration, Logs, vorgeschaltete Dienste und GeoIP-Verarbeitung der öffentlichen Produktionsumgebung bleiben ungeprüft; der Betreiber prüft sie später. Dieses Dokument bestätigt keine abgeschlossene rechtliche Zertifizierung.

## Live-Befund und geprüfte lokale Erweiterung

Am 8. Oktober 2026 lieferte die Startseite HTTP 200 ohne `Set-Cookie`. `/assets/app.js` erstellt einen Worker aus `/assets/worker.js`; dieser importiert lokale `fflate.js` und `analyzer.js`. Dateien werden über `File.text()` beziehungsweise `File.arrayBuffer()` gelesen und ZIP-Dateien lokal entpackt. In App und Worker wurden keine Upload-Aufrufe über Fetch, XHR oder Beacon gefunden. `pagehide` ruft die Bereinigung einschließlich `worker.terminate()` auf. `i18n.js` liest nur die Spracheinstellung und schreibt sie nach einer Nutzeraktion. Die sichtbaren externen Links sind Navigationslinks zu Anleitung und rechtlichen Betreiberseiten.

Für den **neuen** lokalen Code wurden folgende Befunde bestätigt:

| Bereich | Implementierung | Nachweis |
| --- | --- | --- |
| Dateien | Auswahl, Lesen und ZIP-Entpacken lokal im Worker | Worker-Tests mit JSON, Unterordnern, Duplikaten und beschädigten Archiven |
| Verbindungen | Keine Hördaten-POSTs, Spotify-API, externen Skripte, Schriften oder Bilder | Quellcodeprüfung, lokale Assets im Build, CSP `connect-src 'none'` |
| Zeit/Ort | Automatische Browser-Zeitzone; keine Standortfreigabe | Datum-/DST-Tests; kein Geolocation-Aufruf; `Permissions-Policy` sperrt Geolocation |
| Datenminimierung | Spotify-Benutzername, historische IP-Felder, User-Agent und unnötige Rohfelder werden nicht normalisiert behalten | Tests prüfen private Marker in Ergebnis und Worker-Historie; temporärer Deduplizierungsschlüssel wird entfernt |
| Speicherung | Nur ausdrücklich gewählte Sprache in Local Storage; Layout und Hördaten in Laufzeitobjekten | Speicherzugriffe im Client geprüft; keine Hördatenspeicherung in Web Storage oder IndexedDB |
| Sitzungsende | Worker beenden und Datei-/Ergebnisreferenzen verwerfen | `discard()` setzt Zustand zurück und beendet Worker; `pagehide` ruft es auf; Worker-Bereinigung getestet |
| Server | Statische Anwendung; keine Upload-API oder Sitzungscookies | Server-Tests und lokale Nginx-Prüfung: HTTP 405 für POST, keine Cookies, restriktive Header |

Spotify beschreibt Benutzernamen und historische IP-Adressen im erweiterten Export. Obwohl sie nicht in die normalisierte Statistik übernommen werden, liest der Browser beim Parsen die ausgewählte Originaldatei. „Keine Übermittlung der Hördateien“ ist korrekt; „die Originaldatei enthält keine personenbezogenen Daten“ wäre falsch. [Spotify: Understanding your data](https://support.spotify.com/us/article/understanding-your-data/)

Die gewünschten Ansichten verwenden lokal Hörzeit, Zeitstempel, Titel, Künstler/Album beziehungsweise Podcast/Show, Inhaltskennungen, Shuffle-/Skip-/Offline-Werte, Plattform und Länderkennung. Die Länderansicht verwendet die **Länderkennung des Exports**, keine Geolokalisierung historischer IP-Adressen. Weglassen von Namen macht einen individuellen Verlauf nicht automatisch anonym.

## „Nur im Arbeitsspeicher“ präzise beschreiben

Die Anwendung schreibt Hördateien und Ergebnisse nicht in Local Storage, Session Storage, IndexedDB oder Serverdateien. Sie legt kein dauerhaftes Ergebnisarchiv im Browser an. Notwendige Laufzeitobjekte bleiben für die geöffneten Ansichten verfügbar; Filter werden lokal ausgewertet. Layout-Anpassungen bleiben ebenfalls im Arbeitsspeicher.

Worker beenden und Referenzen verwerfen beendet den Zugriff der Anwendung auf diese Daten. Browser und Betriebssystem bestimmen die tatsächliche Speicherfreigabe und können beispielsweise Auslagerung, Prozessabbilder oder Sitzungswiederherstellung verwenden. Deshalb keine garantierte sichere oder sofortige physische Löschung behaupten. Die ausgewählten Originaldateien bleiben auf dem Gerät des Nutzers bestehen.

Die Grenzen von 512 MB pro Datei, 2 GB Gesamt-/entpacktem Volumen und zwei Millionen Einträgen schützen die lokale Verarbeitung vor übergroßen Importen. Sie garantieren keine ausreichende RAM-Kapazität: Ein Gerät, insbesondere ein Mobilgerät, kann schon unterhalb dieser Grenzen an seine Speichergrenze stoßen.

## DSGVO: lokale Analyse und öffentlicher Seitenbetrieb

Die lokale Architektur verhindert den serverseitigen Empfang des Hörverlaufs, befreit den öffentlichen Anbieter aber nicht pauschal von Datenschutzpflichten. Die Haushaltsausnahme persönlicher Nutzeraktivitäten gilt nicht automatisch für Anbieter entsprechender Werkzeuge. [DSGVO, Art. 2 und Erwägungsgrund 18](https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX%3A32016R0679)

Der Betreiber ist für seine Zwecke und Mittel des Seitenbetriebs regelmäßig Verantwortlicher. Hosting-Anbieter können Auftragsverarbeiter sein; Rollen, Verträge und Unterauftragnehmer hängen von der Infrastruktur ab. Reines Veröffentlichen des Codes macht einen Entwickler nicht zum Empfänger der Hördateien. [EDSA: Verantwortlicher und Auftragsverarbeiter](https://www.edpb.europa.eu/sme/learn-the-basics/data-controller-or-data-processor_en)

Für notwendige Verbindungs- und Sicherheitsdaten kommt ein berechtigtes Interesse in Betracht, wenn Erforderlichkeit und Interessenabwägung dokumentiert sind. Das erlaubt keine beliebig ausführlichen Besucherprofile oder unbegrenzten Logs. [DSK, OH Digitale Dienste, Abschnitt IV.5](https://datenschutz.sachsen-anhalt.de/fileadmin/Bibliothek/Landesaemter/LfD/Informationen/orientierungshilfen/OH_Digitale_Dienste.pdf)

Die Datenschutzerklärung soll lokalen Analysezweck und getrennten Seitenbetrieb nachvollziehbar beschreiben. Betreiberangaben zu IP-Verarbeitung, GeoIP, Logfristen und Grundlage werden bei der späteren Serverprüfung mit dem realen Datenfluss abgeglichen.

Musikgeschmack ist nicht generell eine besondere Datenkategorie; Kontext und abgeleitete Einstufungen können sensible Informationen offenbaren. Für VerdeStats keine Religion, politischen Ansichten, Gesundheit oder Sexualität ableiten. Die Übertragung dieser EDSA-Einordnung aus sozialen Medien auf die Anwendung ist eine Risikobewertung. [EDSA, Leitlinien 8/2020, Abschnitt 8.1.2](https://www.edpb.europa.eu/system/files/2021-04/edpb_guidelines_082020_on_the_targeting_of_social_media_users_en.pdf)

## TDDDG: Dateizugriff und Spracheinstellung

§ 25 erfasst Endgerätezugriffe und Local Storage auch ohne Personenbezug. Eine Ausnahme kommt für unbedingt notwendige Zugriffe zur Bereitstellung ausdrücklich gewünschter Funktionen in Betracht. [§ 25 TDDDG](https://www.gesetze-im-internet.de/ttdsg/BJNR198210021.html)

**Bewertung dieser Anwendung:** Bewusste Dateiauswahl fordert deren lokale Auswertung an. Die Spracheinstellung enthält beispielsweise `de` oder `en`, keine Nutzerkennung; Schreiben erfolgt erst nach Sprachwahl. Die Oberfläche informiert über die Speicherung im aktuellen Browser. Layout bleibt im Arbeitsspeicher. Aus diesen begrenzten Funktionen allein ergibt sich kein Bedarf für einen allgemeinen Tracking-Einwilligungsbanner. Zusätzliche Tracking-Technik des Betreibers würde eine neue Bewertung erfordern. [DSK, OH Digitale Dienste, insbesondere Randnummern 80–83](https://datenschutz.sachsen-anhalt.de/fileadmin/Bibliothek/Landesaemter/LfD/Informationen/orientierungshilfen/OH_Digitale_Dienste.pdf)

## Spätere Prüfung der Produktionsumgebung

Der Nutzer prüft die Serverkonfiguration separat. Relevant sind:

- Öffentliches HTTPS und tatsächlich ausgelieferte Response-Header prüfen. Der lokale Build liefert ausschließlich lokale Ressourcen, restriktive CSP und statische Nginx-Seiten; in der mitgelieferten Nginx-Konfiguration sind Zugriffslogs abgeschaltet. Das bestätigt keine entsprechenden Einstellungen eines vorgeschalteten Produktions-Proxys oder CDNs.
- Webserver-/Proxy-/CDN-Logs: IP-Adresse, User-Agent, GeoIP, Cookies, Empfänger, Zugriffsrechte und Fristen. „Nur im RAM“ oder „keine Logs“ nur behaupten, wenn dies über die vorgeschaltete Infrastruktur stimmt.
- Hosting-/Proxy-Verträge, Unterauftragnehmer, Betriebs-/Supportstandorte und mögliche Drittlandübermittlungen. Ein EWR-Serverstandort beschreibt nicht alle Zugriffsmöglichkeiten. [EDSA: Internationale Übermittlungen](https://www.edpb.europa.eu/sme/be-compliant/international-data-transfers_en)
- Öffentliche Informationen und Kontaktweg für Anfragen mit dem tatsächlichen Betrieb abgleichen. Rechte gelten weiterhin für verarbeitete Verbindungsdaten. [EDSA: Betroffenenrechte](https://www.edpb.europa.eu/sme/be-compliant/respect-individuals-rights_en)

Regelmäßige Betriebsdaten erfordern passende Dokumentation und Risikoprüfung; kleine Betreiber sind nicht pauschal ausgenommen. Bei voraussichtlich hohem Risiko ist eine Folgenabschätzung erforderlich. [DSGVO, Art. 30 und 35](https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX%3A32016R0679) Ein Vorfallverfahren sollte Zuständigkeiten, Dokumentation und gegebenenfalls Meldung innerhalb von 72 Stunden ab Kenntnis abdecken. [EDSA: Datenschutzverletzungen](https://www.edpb.europa.eu/sme/assess-the-risks/data-breaches_en)

## Unabhängige abschließende Codeprüfung

Die separate Prüfung von Analyzer, Worker und statischem Server fand zwei konkrete Probleme, die vor Abschluss behoben wurden: Ungültige Request-URLs werden abgefangen; die ZIP-Entpackung verwendet ausschließlich das zuvor geprüfte Verzeichnis und eine begrenzte Ausgabepuffergröße. Ein zusätzlicher Regressionstest prüft einen gefälschten ZIP-Abschluss im Archivkommentar, ohne dafür eine große Speicherallokation zuzulassen. Er besteht und bestätigt die Verarbeitung des tatsächlich validierten Inhalts. Enddatum, DST, bekannte/fehlende Shuffle-/Skip-/Offline-Werte und lokale Aggregationen für die Hover-Statistiken wurden ebenfalls geprüft. Aus dieser Codeprüfung sind keine offenen Blocker verblieben; die getrennte Prüfung des öffentlichen Serverbetriebs steht weiterhin aus.

## Punkte 59 und 60 brauchen eine spätere Prüfung; Punkt 65 ist ausgeschlossen

**Karten und Poster:** Eine lokal erzeugte, bewusst heruntergeladene Darstellung braucht keine öffentliche Galerie oder Ergebnis-URL. Später persönliche Angaben sparsam vorbelegen und eine Vorschau anbieten. Cover-Rechte zusätzlich prüfen; diese Ausbaustufe ruft keine Cover ab.

**Spotify-Integration:** Die aktuelle Developer Policy untersagt in III.13 die Analyse von Spotify-Inhalten beziehungsweise des Dienstes, einschließlich abgeleiteter Hörmetriken und Nutzerstatistiken. Eine gesicherte Ausnahme für API-angereicherte Statistik wurde nicht festgestellt. Datenschutz-Einwilligung schafft keine vertragliche Plattform-Erlaubnis. [Spotify Developer Policy, III.13](https://developer.spotify.com/policy)

Development Mode setzt Premium beim App-Betreiber voraus und erlaubt bis zu fünf freigeschaltete authentifizierte Nutzer. Neue Extended-Quota-Bewerbungen verlangen unter anderem eine Organisation und mindestens 250.000 monatlich aktive Nutzer. [Spotify: Quota modes](https://developer.spotify.com/documentation/web-api/concepts/quota-modes) Seit Juli 2026 sind bis zu 25 Client-IDs mit gemeinsamer Entwicklerquote vorgesehen. [Spotify: Juli-Update](https://developer.spotify.com/blog/2026-07-23-web-api-quota-updates)

Cover-Metadaten könnten technisch ohne Nutzerfreigabe per Client Credentials angefragt werden; damit sind Analysebeschränkung und Quotenproblem nicht geklärt. [Spotify: Client Credentials Flow](https://developer.spotify.com/documentation/web-api/tutorials/client-credentials-flow) Zuordnung/Rückverlinkung, unveränderte Coverdarstellung und enge Cache-Grenzen wären zusätzlich zu beachten. Eigenständige Bildexporte erhalten keine pauschale Lizenz. [Spotify: Design-Regeln](https://developer.spotify.com/documentation/design), [Developer Terms, IV.3](https://developer.spotify.com/terms)

**Entscheidung:** Punkt 65 wurde ausdrücklich aus dem aktuellen Plan gestrichen. Keine Spotify-API, kein OAuth und keine externen Cover. Die Browser-Auswertung funktioniert vollständig ohne diese Verbindung. Die ursprünglichen Freigaben und späteren Änderungen sind in [plan.md](../plan.md) dokumentiert.
