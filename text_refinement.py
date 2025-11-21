from typing import Dict, Any, List
import json

text_segments_json = "output1.json"
outpath = "output1_separated.json"

with open(text_segments_json, "r", encoding="utf-8") as f:
    data = json.load(f)


def collect_speaker_texts(data):

    per_speaker: Dict[str, List[str]] = {}

    for seg in data.get("segments_with_speaker", []):
        speaker_id = seg["speaker_id"]
        text = (seg.get("text") or "").strip()
        if not text:
            continue

        if speaker_id not in per_speaker:
            per_speaker[speaker_id] = []
        per_speaker[speaker_id].append(text)

    # Listen zu einem String pro Speaker zusammenfügen
    return {
        speaker_id: " ".join(text_parts)
        for speaker_id, text_parts in per_speaker.items()
    }

output = (collect_speaker_texts(data))


with open(outpath, "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)