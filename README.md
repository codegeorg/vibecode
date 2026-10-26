# R Lernstudio

Ein deutschsprachiger Ein-Tages-Kurs für R und Zeitreihenanalyse, neu aufgebaut aus den bereitgestellten Musterlösungen. Die Anwendung verwendet **echtes R 4.4.1 über WebR**, keine nachgebildete Konsole. Code und Grafiken werden lokal im Browser berechnet.

## Starten

Voraussetzungen: Node.js mit npm und Python 3. Zum Testen zusätzlich Chromium.

```sh
cd /workspace/vibecode
npm ci --cache /workspace/.npm --no-audit --no-fund
npm run dev
```

Der Server verwendet Port 8000, standardmäßig auf `0.0.0.0`. Ein anderer Port ist mit `python3 server.py --port 8001` möglich. Der Python-Server setzt die Isolation-Header für WebAssembly; auf anderen HTTP-Servern kann WebR auch den PostMessage-Kanal verwenden. Die App muss über HTTP laufen, nicht über `file://`.

Es gibt keinen Build-Schritt und keine API-Schlüssel. WebR, die R-Standardbibliotheken und die Schriftarten werden lokal ausgeliefert. Beim ersten Start lädt der Browser die WebAssembly-Laufzeit (rund 11 MB plus Bibliotheken). Die Anwendung benötigt nach der Installation keine externen CDNs.

## Funktionen

- 18 Lektionen in sechs Abschnitten, mit etwa 425 Minuten Lerninhalt; mit Pausen ein Lerntag.
- Befehle erklärt, Aufgaben, Hinweise, Musterlösungen und ergebnisbasierte Prüfungen.
- R-Editor mit Syntaxhervorhebung, Zeilennummern, Ctrl/⌘ + Enter, Kopieren und `.R`-Export.
- Echte Konsolenausgabe und R-Grafiken; abbrechbare Ausführung, Zeitlimit und Neustart der R-Sitzung.
- Freier Übungsraum mit persistierenden R-Objekten innerhalb der laufenden Sitzung.
- Import eigener CSV-/Textdateien bis 5 MB in das virtuelle R-Dateisystem.
- Suchbarer Spickzettel und Kurssuche über Ctrl/⌘ + K.
- Fortschritt und Codeentwürfe im lokalen Browserspeicher; responsive Navigation.
- Download aller Musterlösungen als zusammenhängendes, in Base R ausführbares Skript.

Die Originaldatendateien waren nicht Teil der Vorlage. `visitors`, `cpi` und `y` sind klar gekennzeichnete, reproduzierbare synthetische Übungsdaten. Sie ergeben andere Resultate als die ursprünglichen Kursdateien. `visitors.csv` liegt im virtuellen Arbeitsverzeichnis von R bereit und kann heruntergeladen werden.

Jeder Lektionslauf verwendet eine eigene R-Umgebung mit frischen Basisreihen, damit frühere Versuche keine Prüfung versehentlich bestehen lassen. Im freien Übungsraum bleiben selbst erstellte Objekte bis zum Neuladen oder Neustart erhalten. Der Inhalt des virtuellen R-Dateisystems ist flüchtig. Entwürfe und Fortschritt bleiben über `localStorage` erhalten, jedoch nicht automatisch geräteübergreifend.

Die R-Standardpakete sind enthalten. `stats::PP.test()` funktioniert direkt. `tseries::adf.test()` wird erläutert, benötigt aber ein hier nicht installiertes Zusatzpaket. Beliebige zusätzliche R-Pakete sind nicht Teil der Offline-Laufzeit.

## Fachliche Korrekturen zur Vorlage

Der Kurs erläutert unter anderem die quadrierte SSE statt der Summe der Residuen, unterschiedliche Skalen bei Zerlegungen, korrekte Unit-Root-Nullhypothesen, `fitdf` bei Ljung-Box, vergleichbare AIC/BIC, die MA-Vorzeichenkonvention von R und das Prozessmittel beim stationären ARMA. Saisonale Daten schließen SARIMA nicht aus. Im Abschlussprojekt wird die Prognose auf zurückgehaltenen Testdaten bewertet.

## Tests

```sh
npm test
```

Der Test startet selbst einen Server auf Port 8765 und führt alle 18 Musterlösungen im echten WebR aus. Er prüft auch Grafiken, abgelehnte unvollständige Lösungen, Fehlermeldungen, Speichern nach Neuladen, freien R-Code, Objektpersistenz, CSV-Import, Downloads, Suche und mobile Navigation. Chromium wird unter `/usr/bin/chromium` erwartet; alternativ `CHROMIUM_PATH` setzen.

## Dateien

- `curriculum.js`: Lektionen, Musterlösungen, Ergebnisprüfungen und Spickzettel.
- `app.js`: Oberfläche, Editor, Navigation, Speicherung und WebR-Anbindung.
- `style.css`, `index.html`: responsive Gestaltung und Seitenrahmen.
- `server.py`: lokaler HTTP-Server mit passenden Isolations-Headern.
- `tests/smoke.cjs`: Browser- und R-Integrationstests.

Schriftlizenzen liegen unter `assets/fonts/`. WebR und seine Abhängigkeiten werden über den festen npm-Lockfile installiert.

## Einzeldatei zum direkten Öffnen

```sh
python3 scripts/export_standalone.py /tmp/R-Lernstudio.html
```

Die resultierende Datei enthält die Oberfläche, alle Lektionen und die Schriftarten. Sie lässt sich ohne Installation im Browser öffnen. Nur die fest gepinnte R-Laufzeit (WebR 0.4.2) wird von `cdn.jsdelivr.net` geladen; dafür ist eine Internetverbindung nötig. Empfohlen: aktuelles Chrome oder Edge auf einem Computer. Lokale Browserrichtlinien können die Ausführung heruntergeladener HTML-Dateien einschränken.

## Veröffentlichung auf GitHub Pages

Die Website wird aus `main` im Repository-Stamm bereitgestellt. `npm run build` erstellt `index.html` aus `index.template.html`, den Kursinhalten, Styles, Schriftarten und dem Anwendungscode. Die generierte Seite benötigt auf GitHub Pages keine `node_modules`: Sie lädt WebR 0.4.2 vom festgelegten CDN. Auf localhost nutzt sie die lokal installierte Laufzeit, sodass die Integrationstests ohne externe Anfragen laufen.

Nach Änderungen an der Oberfläche oder den Lektionen zuerst `npm run build` ausführen. `index.html` und die Quelldateien gemeinsam veröffentlichen.
