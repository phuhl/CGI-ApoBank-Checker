import tempfile
import json
from pathlib import Path
from typing import Dict, Any, List

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from openai import OpenAI

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware


# ---------- config----------

OPENAI_MODEL_TRANSCRIBE = "whisper-1"      
OPENAI_MODEL_CHAT = "gpt-4.1-mini"         

client = OpenAI()

BASE_DIR = Path(__file__).resolve().parent
CHECKLIST_PATH = BASE_DIR / "checklists.json"

if not CHECKLIST_PATH.exists():
    raise RuntimeError(f"checklists.json nicht gefunden unter {CHECKLIST_PATH}")

with CHECKLIST_PATH.open(encoding="utf-8") as f:
    CHECKLISTS: Dict[str, List[Dict[str, Any]]] = json.load(f)

CONVERSATION_TYPES = list(CHECKLISTS.keys())


# ---------- FastAPI app ----------

app = FastAPI(
    title="apoBank Call Audit Prototype",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# -----------------------------
#  Static files (front-end)
# -----------------------------
app.mount("/static", StaticFiles(directory="static"), name="static")

# -----------------------------
#  Main page (index.html)
# -----------------------------
@app.get("/", response_class=FileResponse)
async def serve_frontend():
    return FileResponse("static/index.html")

# ---------- Antwort model---------

class ChecklistItemResult(BaseModel):
    id: str
    description: str
    status: str              # "vorhanden" | "fehlt" | "unklar"
    evidence: str | None = None

class AnalysisResponse(BaseModel):
    conversation_type: str
    ampel: str               # "gruen" | "gelb" | "rot"
    coverage: float
    items: List[ChecklistItemResult]
    transcript: str


# ---------- ----------

def transcribe_audio_to_text(file_path: Path) -> str:
    """transcript mit Whisper."""
    with file_path.open("rb") as f:
        result = client.audio.transcriptions.create(
            model=OPENAI_MODEL_TRANSCRIBE,
            file=f,
            language="de",
        )
    text = getattr(result, "text", None) or result["text"]
    return text


def detect_conversation_type(transcript: str) -> str:
    """تllm erkent welche typen."""

    types_description = "\n".join(f"- {t}" for t in CONVERSATION_TYPES)

    system_msg = (
        "Du bist ein Compliance-Experte in einer deutschen Bank. "
        "Ordne jedes Transkript genau einem der vordefinierten Gesprächstypen zu."
    )

    user_msg = f"""
Hier ist das Transkript eines aufgezeichneten Kundentelefonats (deutsch):

\"\"\"{transcript}\"\"\"

Wähle genau einen der folgenden Gesprächstypen (verwende GENAU den Schlüssel):

{types_description}

Antworte im JSON-Format:
{{"conversation_type": "<einer der Schlüssel oben>", "begruendung": "<kurze Begründung>"}}
"""

    resp = client.chat.completions.create(
        model=OPENAI_MODEL_CHAT,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system_msg},
            {"role": "user", "content": user_msg},
        ],
        temperature=0.1,
    )

    content = resp.choices[0].message.content
    data = json.loads(content)
    ctype = data["conversation_type"]

    if ctype not in CONVERSATION_TYPES:
        raise ValueError(f"Unknown conversation_type from model: {ctype}")

    return ctype


def evaluate_against_checklist(
    transcript: str,
    conversation_type: str,
) -> List[ChecklistItemResult]:
    """بLLM überprüft jede Item mit checklist."""

    checklist = CHECKLISTS[conversation_type]

    checklist_text = "\n".join(
        f'{item["id"]}: {item["description"]}'
        for item in checklist
    )

    system_msg = (
        "Du bist ein Compliance-Prüfer. "
        "Du prüfst, ob regulatorische Pflichtinhalte in einem Gesprächstranskript vorkommen."
    )

    user_msg = f"""
Transkript des Kundentelefonats (deutsch):

\"\"\"{transcript}\"\"\"

Gesprächstyp: {conversation_type}

Checkliste der Pflichtinhalte (für diesen Typ):
{checklist_text}

Für jeden Punkt sollst du entscheiden:

- status: "vorhanden", "fehlt" oder "unklar"
- evidence: ein kurzer Satz aus dem Transkript, der deine Entscheidung stützt (oder leer, falls fehlt).

Antworte NUR im JSON-Format:

{{
  "items": [
    {{
      "id": "item_1",
      "status": "vorhanden" | "fehlt" | "unklar",
      "evidence": "..."
    }},
    ...
  ]
}}

Nutze ausschließlich die IDs aus der Liste oben.
"""

    resp = client.chat.completions.create(
        model=OPENAI_MODEL_CHAT,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system_msg},
            {"role": "user", "content": user_msg},
        ],
        temperature=0.1,
    )

    content = resp.choices[0].message.content
    data = json.loads(content)
    items_raw = data["items"]

    desc_by_id = {item["id"]: item["description"] for item in checklist}

    results: List[ChecklistItemResult] = []
    for item in items_raw:
        item_id = item["id"]
        status = item["status"]
        evidence = item.get("evidence") or None

        results.append(
            ChecklistItemResult(
                id=item_id,
                description=desc_by_id.get(item_id, ""),
                status=status,
                evidence=evidence,
            )
        )

    return results


def compute_ampel(items: List[ChecklistItemResult]) -> tuple[str, float]:
    """frome the perzent it calculate the person of ampelو"""
    total = len(items)
    if total == 0:
        return "rot", 0.0

    vorhanden_count = sum(1 for i in items if i.status == "vorhanden")
    coverage = vorhanden_count / total
    any_missing = any(i.status == "fehlt" for i in items)

    if coverage >= 0.9 and not any_missing:
        ampel = "gruen"
    elif coverage >= 0.7:
        ampel = "gelb"
    else:
        ampel = "rot"

    return ampel, coverage


# ---------- ----------

@app.post("/analyze_call/", response_model=AnalysisResponse)
async def analyze_call(audio_file: UploadFile = File(...)):
    """it return checklist result + transcript + type + Ampel for uploaded audio file."""

    if not audio_file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded")

    suffix = Path(audio_file.filename).suffix or ".wav"

    try:
        # 1) 
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            temp_path = Path(tmp.name)
            contents = await audio_file.read()
            tmp.write(contents)

        # 2) STT
        transcript = transcribe_audio_to_text(temp_path)

        # 3) Typenerkennung
        conversation_type = detect_conversation_type(transcript)

        # 4) 
        items = evaluate_against_checklist(transcript, conversation_type)

        # 5) Ampel
        ampel, coverage = compute_ampel(items)

        # 6) 
        return AnalysisResponse(
            conversation_type=conversation_type,
            ampel=ampel,
            coverage=coverage,
            items=items,
            transcript=transcript,
        )

    finally:
        try:
            if "temp_path" in locals() and temp_path.exists():
                temp_path.unlink()
        except Exception:
            pass

