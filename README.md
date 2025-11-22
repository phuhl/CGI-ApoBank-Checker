# CGI-ApoBank-Checker

Die ApoBank empfängt Wertpapier-Orders via Telefon. Die Gespräche, je
nachdem, was genau besprochen wird, müssen gewisse Erklärungen seitens
des Sachbearbeites erfolgen.

Der ApoBank Compliance Checker transkribiert die Gespräche zuerst,
klassifiziert dann mit Hilfe eines LLMs, was für ein Gesprächstyp
vorliegt um dann die korrekten Complience-Anforderungen zu überprüfen.

## Aufbau

Das Projekt besteht aus folgenden Komponenten:
- Frontend: User Interface auf dem eine Audiodatei hochgeladen werden
  kann und die Ergebnisse angezeigt werden (Ordner: frontend/react)
- Backend: Empfängt und verarbeitet Audiodateien. (Ordner: backend)
- Optionaler verbesserter Transcription Modus: Transcribiert mit der
  Faster-Whisper API und fügt Sprecherannotationen mit der Library
  pyannote.audio hinzu.
  - Wird aktuell im Backend nicht genutzt, da hierfür ein Server mit
    GPU notwendig ist, um akzeptable Performance zu liefern

## Ablauf des Programms

Im Backend wird die Audiodatei transkribiert und in folgenden
Schritten verarbeitet:
1. Kundenberater wird identifiziert: Wenn Sprecher-Annotations
   existieren, dann nur mit generischen Bezeichnungen Speaker00 und
   Speaker01. Mithilfe von einem LLM-Aufruf wird identifiziert,
   welcher der beiden Sprecher der Kundenberater ist. Die
   Transkription wird angepasst, sodass daraus hervorgeht, wer der
   Kundenberater ist.
2. Gesprächstyp wird festgestellt, mithilfe der Transkription. Diese wird ebenfalls einem LLM übergeben, welches durch eine weitere regelbasierte Wahrscheinlichkeitsberechnung.
3. Anhand des Gesprächstyps wird die Compliance und ein
   Confidence-Score erstellt:
   - Jede Frage wird von einem LLM einzelt mehrfach verarbeitet. Das
     LLM bewertet, ob eine Frage/Anforderung singemäß behandet wurde.
   - Die Confidence wird daraus berechnet, wie viele der LLM-Anfragen
     das gleiche Ergebniss liefern (z.B. 3 Antworten sagen compliant,
     1 sagt nicht compliant -> compliant, confidence 75%)
4. Final wird für alle beantworteten Fragen mithilfe eines LLMs der
   relevante Auzzug aus dem Gespräch extrahiert um diesen zur
   eventuellen manuellen Gegenprüfung anzuzeigen.


Die Frage/Anforderungen können vor dem Upload bearbeitet werden.


# Aufgabenzuteilung:

### Arta Karimzadeh:
- Demo-Video-Erstellung,

### Tobias Bergmann:
- Implementierung von Whisper und Pyannote,
- Regelbasierte Gesprächtyperkennung,
- IONOS-LLM-Anbindung,
- Präsentation,


### Florian Wächter: 
- Verwaltung des IONOS-Servers,
- Demo-Video-Erstellung,
- IONOS-LLM-Anbindung,
- Frontend Entwicklung,
- Präsentation,
- App-Design

### Rafael Ramazanov: 
- Implementierung von Whisper und Pyannote,
- HuggingFace Token für Pyannote
- Verwaltung des IONOS-Servers

### Philipp Uhl: 
- Generelle Programm-Architektur,
- Verwaltung des IONOS-Servers,
- Aufsetzung des Web-Servers,
- Backend Entwicklung,
- OpenAI-Anbindung,
- OpeanAI Token









