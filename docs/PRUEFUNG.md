# Prüfung — Autohaus DIL · Digitales Werbedisplay

Stand: 11. November 2026. Geprüft unter Windows mit Microsoft Edge 157.0.4341.42 im automatisierten Browserbetrieb ohne sichtbares Fenster.

## Durchgeführte Prüfungen

| Bereich                     | Ergebnis                                                                                                                |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Automatisierte Logikprüfung | `npm test` erfolgreich: Wiedergabe, Navigation, Fehlerbehandlung, Bilddauer, Tastaturpause und Medienpfade.             |
| Lokale JSON-Auswahl         | Ohne Auswahl erscheint ein deutscher Hinweis. Nach Auswahl von `media/playlist.json` werden fünf Einträge geladen.      |
| Ungültige JSON-Auswahl      | Fehlerhafte Daten ersetzen die funktionierende Liste nicht. Deutsche Fehlermeldung vorhanden.                           |
| Video-Dekodierung           | Alle fünf mitgelieferten Videos erreichen einen abspielbaren Zustand. Tatsächlicher Zeitfortschritt zusätzlich geprüft. |
| Wiedergabesymbole           | Im Pausenzustand ist das Wiedergabesymbol sichtbar, das Pausensymbol ausgeblendet.                                      |
| Reduzierte Bewegung         | Kein automatischer Start. Manueller Start funktioniert.                                                                 |
| Tastatur                    | Tabulatortaste pausiert laufende Wiedergabe.                                                                            |
| Vollbild                    | Ein- und Ausschalten im getesteten Browser erfolgreich.                                                                 |
| Vorschau-Server             | Video-Teilabruf liefert HTTP 206 und die angefragten 100 Bytes; ungültiger Bereich liefert HTTP 416.                    |
| Browserfehler               | Während der geprüften regulären Wiedergabe keine JavaScript-Seitenfehler erfasst.                                       |

## Bildschirmgrößen

| Ansicht             | Größe in CSS-Pixeln | Ergebnis                                                                             |
| ------------------- | ------------------- | ------------------------------------------------------------------------------------ |
| Smartphone          | 375 × 812           | Keine horizontale Überbreite; Bedienelemente sichtbar.                               |
| Tablet hochkant     | 768 × 1024          | Keine horizontale Überbreite; Bedienelemente sichtbar.                               |
| Querformat          | 812 × 375           | Keine horizontale Überbreite; Hochformatwerbung wird entsprechend klein dargestellt. |
| Desktop             | 1440 × 900          | Keine horizontale Überbreite.                                                        |
| Lokale Dateiansicht | 375 × 812           | Schaltfläche „Wiedergabeliste“ sichtbar und ohne Überlappung.                        |

Die PNG-Dateien in diesem Ordner zeigen den tatsächlichen Browserinhalt. Die Medien wurden für die Aufnahmen angehalten. Schwarze Ränder entstehen durch die vollständige, unverzerrte Darstellung unterschiedlicher Seitenverhältnisse.

## Medien und Sprache

`Fernseher.mp4` hat 1366 × 768 Pixel und 25 Sekunden Laufzeit. Die vier Fahrzeugvideos haben jeweils 1080 × 1920 Pixel und 30 Sekunden Laufzeit. Stichprobenbilder bei etwa zwei Sekunden zeigen deutsche Werbetexte. Die Übersicht steht in `media-review.png`.

Der originale Markenslogan „Dreams Come True“, Fahrzeugnamen und Ausstattungsbezeichnungen bleiben unverändert. Die Weihnachtsaktion enthält das Datum 19.11.2026. Das Material dient als Portfolio-Beispiel und bestätigt keine aktuelle Verfügbarkeit von Fahrzeugen oder Aktionen.

## Grenzen und manuelle Prüfung am Zielgerät

- Die Prüfung verwendet einen echten Browser mit emulierten Fenstergrößen, kein physisches Smartphone oder Schaufensterdisplay.
- Safari, Firefox, tatsächliche Touch-Bedienung und Screenreader wurden nicht geprüft.
- Die Medien-Sichtprüfung ist eine Stichprobe, keine vollständige Prüfung aller Videobilder oder der Tonspur.
- Vor dem produktiven Einsatz Hochformat, Vollbild, Energiespareinstellungen und einen längeren Wiedergabedurchlauf am vorgesehenen Gerät prüfen.

## Wiederholung

1. Im Projektordner `npm test` ausführen.
2. Mit `npm start` die Vorschau starten und `http://localhost:8000` öffnen.
3. Vor/zurück, Pause/Weiter und Vollbild bedienen.
4. Mit Tab navigieren und den Pausenzustand kontrollieren.
5. Mit aktivierter Einstellung für reduzierte Bewegung neu laden.
6. `index.html` direkt öffnen und `media/playlist.json` auswählen.
7. Eine ungültige JSON-Datei auswählen und prüfen, dass die bestehende Liste erhalten bleibt.
