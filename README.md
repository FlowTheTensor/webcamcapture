# 📷 Webcam Capture

Eine Arduino-App, die den Webcam-Feed live im Browser anzeigt und Bilder aufsteigend nummeriert in einen wählbaren Ordner speichert.

## Funktionsweise

Der Python-Backend streamt kontinuierlich Frames der angeschlossenen Webcam (Index 0) via **Socket.IO** als Base64-kodierte JPEG-Bilder an das Browser-Frontend. Im Browser werden die Frames als Live-Feed dargestellt. Per Klick (oder Gedrückthalten für Dauermodus) können einzelne oder fortlaufend Bilder als `.jpg`-Dateien gespeichert werden.

## Projektstruktur

```
webcamcapture/
├── app.yaml              # App-Konfiguration (Name, Beschreibung, Bricks)
├── python/
│   └── main.py           # Backend: Webcam-Stream via OpenCV + Socket.IO
└── assets/
    ├── index.html         # Benutzeroberfläche
    ├── style.css          # Styles
    ├── app.js             # Frontend-Logik (Socket.IO, Datei-API, Capture)
    └── libs/
        └── socket.io.min.js
```

Per VSCode oder AppLab auf den Ardunio Uno Q schieben und App starten.

Anschließend die angezeigte URL im Browser öffnen (z. B. `http://localhost:5000`).

## Features

| Feature | Beschreibung |
|---|---|
| Live-Stream | Webcam-Feed mit ~30 FPS direkt im Browser |
| Ordnerauswahl | Speicherordner frei wählbar via File System Access API |
| Dauermodus | Capture-Button gedrückt halten für Serienaufnahmen |
| Automatische Nummerierung | Bilder werden als `000001.jpg`, `000002.jpg`, … gespeichert; bereits vorhandene Nummern werden berücksichtigt |
| Download-Fallback | Kein HTTPS? Bilder landen automatisch im Browser-Download-Ordner |
| Verbindungsstatus | Overlay zeigt Verbindungsprobleme oder fehlende Webcam an |

## Hinweise

- Die Ordnerauswahl und das direkte Speichern in einen Ordner erfordern einen **sicheren Kontext** (HTTPS oder `localhost`) sowie einen Chromium-basierten Browser (Chrome, Edge). In anderen Browsern oder per HTTP wird automatisch auf den Download-Ordner zurückgegriffen.
- Webcam-Index `0` ist fest eingestellt (erste Kamera). Für andere Kameras `cv2.VideoCapture(0)` in `main.py` anpassen.
