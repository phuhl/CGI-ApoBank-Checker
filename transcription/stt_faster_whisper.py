# file: stt_faster_whisper.py

from faster_whisper import WhisperModel
from typing import Dict, Any, List


MODEL_SIZE = "medium"

# Adjust device as needed:
#   - device="cpu", compute_type="int8"      → CPU
#   - device="cuda", compute_type="int8"    → GPU with int8 quantization
model = WhisperModel(
    MODEL_SIZE,
    device="cpu",        # change to "cuda" if you have a GPU
    compute_type="int8"
)


def transcribe_audio(
    audio_path: str,
    language: str = "de"
) -> Dict[str, Any]:
    """
    Transcribe audio file with faster-whisper and return
    segments + word-level timestamps (for later diarization alignment).

    Also prints each segment as it is produced.
    """

    segments, info = model.transcribe(
        audio_path,
        language=language,
        beam_size=5,
        word_timestamps=True
    )

    segment_list: List[Dict[str, Any]] = []
    word_list: List[Dict[str, Any]] = []

    for seg in segments:
        # --- live-ish console output ---
        print(f"[{seg.start:.2f} - {seg.end:.2f}] {seg.text.strip()}", flush=True)

        # --- collect segments for JSON result ---
        segment_list.append(
            {
                "start": seg.start,
                "end": seg.end,
                "text": seg.text.strip(),
            }
        )

        # --- collect word-level timestamps for later alignment with pyannote ---
        if seg.words:
            for w in seg.words:
                word_list.append(
                    {
                        "start": w.start,
                        "end": w.end,
                        "word": w.word,
                    }
                )

    return {
        "language": info.language,
        "language_probability": info.language_probability,
        "segments": segment_list,
        "words": word_list,
    }


if __name__ == "__main__":
    import sys
    import json

    if len(sys.argv) < 2:
        print("Usage: python stt_faster_whisper.py path/to/audio.(wav|mp3)", flush=True)
        sys.exit(1)

    audio_file = sys.argv[1]
    result = transcribe_audio(audio_file, language="de")

    # final JSON output after all segments were printed
    print("\n--- JSON RESULT ---")
    print(json.dumps(result, ensure_ascii=False, indent=2))
