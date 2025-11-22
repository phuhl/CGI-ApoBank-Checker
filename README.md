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

## Ablauf der Verarbeitung im Backend

Im Backend wird die Audiodatei transkribiert und in folgenden
Schritten verarbeitet:
1. Kundenberater wird identifiziert: Wenn Sprecher-Annotations
   existieren, dann nur mit generischen Bezeichnungen Speaker00 und
   Speaker01. Mithilfe von einem LLM aufruf wird identifiziert,
   welcher der beiden Sprecher der Kundenberater ist. Die
   Transkription wird angepasst, sodass daraus hervorgeht, wer der
   Kundenberater ist.
2. Gesprächstyp wird festgestellt.
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
