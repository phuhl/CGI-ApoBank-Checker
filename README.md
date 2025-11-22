# CGI-ApoBank-Checker

Die ApoBank empfängt Wertpapier-Orders via Telefon. Die Gespräche, je
nachdem, was genau besprochen wird, müssen gewisse Erklärungen seitens
des Sachbearbeiters erfolgen.

Der ApoBank Compliance Checker transkribiert die Gespräche zuerst,
klassifiziert dann mit Hilfe eines LLMs, was für ein Gesprächstyp
vorliegt, um dann die korrekten Compliance-Anforderungen zu überprüfen.

## Aufbau

Das Projekt besteht aus folgenden Komponenten:
- **Frontend:** User Interface, auf dem eine Audiodatei hochgeladen werden
  kann und die Ergebnisse angezeigt werden (Ordner: `frontend/react`)
- **Backend:** Empfängt und verarbeitet Audiodateien (Ordner: `backend`)
- **Optionaler verbesserter Transkriptionsmodus:** Transkribiert mit der
  Faster-Whisper-API und fügt Sprecherannotationen mit der Library
  `pyannote.audio` hinzu.
  - Wird aktuell im Backend nicht genutzt, da hierfür ein Server mit
    GPU notwendig ist, um akzeptable Performance zu liefern

## Ablauf des Programms

Im Backend wird die Audiodatei transkribiert und in folgenden
Schritten verarbeitet:

1. **Kundenberater identifizieren**  
   Wenn Sprecher-Annotationen existieren, dann nur mit generischen
   Bezeichnungen `Speaker00` und `Speaker01`. Mithilfe eines
   LLM-Aufrufs wird identifiziert, welcher der beiden Sprecher der
   Kundenberater ist. Die Transkription wird angepasst, sodass daraus
   hervorgeht, wer der Kundenberater ist.

2. **Gesprächstyp feststellen**  
   Die Transkription wird einem LLM übergeben, welches den
   Gesprächstyp bestimmt. Das Ergebnis wird durch eine weitere
   regelbasierte Wahrscheinlichkeitsberechnung ergänzt.

3. **Compliance-Prüfung und Confidence-Score**  
   Anhand des Gesprächstyps werden die Compliance und ein
   Confidence-Score erstellt:
   - Jede Frage wird von einem LLM einzeln mehrfach verarbeitet. Das
     LLM bewertet, ob eine Frage/Anforderung sinngemäß behandelt wurde.
   - Die Confidence wird daraus berechnet, wie viele der LLM-Anfragen
     das gleiche Ergebnis liefern (z. B. 3 Antworten sagen „compliant“,
     1 sagt „nicht compliant“ → Ergebnis: compliant, Confidence 75 %).

4. **Relevante Gesprächsausschnitte extrahieren**  
   Für alle beantworteten Fragen wird mithilfe eines LLMs der relevante
   Auszug aus dem Gespräch extrahiert, um diesen zur eventuellen
   manuellen Gegenprüfung anzuzeigen.

Die Fragen/Anforderungen können vor dem Upload bearbeitet werden.


## Lokales Setup für den Transkriptor (Server)

**Voraussetzungen:**

- Du bist auf Linux (z. B. Ubuntu-Server).
- Du arbeitest im Home-Verzeichnis, z. B. `~` oder `/root`.

Ziel: Nach dem Klonen des Repos sollst du lokal auf dem Server so etwas ausführen können:

```bash
python transcription/stt_with_diarization_new.py Order1.mp3
```



## Aufgabenzuteilung

### Arta Karimzadeh
* Frontend-Basis (HTML/CSS/JS) für Audio-Analyse
* Checkliste-Anpassen-Ansicht im Frontend  React
* Excel-Checklisten zu JSON konvertiert
* Python-Backend-Prototyp (FastAPI)
* Audio-Upload & Analyse-Workflow  
* Demo-Video-Erstellung

### Tobias Bergmann
- Implementierung von Whisper und pyannote
- Regelbasierte Gesprächstyp-Erkennung
- IONOS-LLM-Anbindung
- Präsentation

### Florian Wächter
- Verwaltung des IONOS-Servers
- Demo-Video-Erstellung
- IONOS-LLM-Anbindung
- Frontend-Entwicklung
- Präsentation
- App-Design

### Rafael Ramazanov
- Implementierung von Whisper und pyannote
- HuggingFace-Token für pyannote
- Verwaltung des IONOS-Servers

### Philipp Uhl
- Generelle Programm-Architektur
- Verwaltung des IONOS-Servers
- Aufsetzung des Web-Servers
- Backend-Entwicklung
- OpenAI-Anbindung
- OpenAI-Token