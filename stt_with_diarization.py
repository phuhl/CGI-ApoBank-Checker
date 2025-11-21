import os
import json
from typing import Dict, Any, List, Optional

from faster_whisper import WhisperModel
from pyannote.audio import Pipeline
import torchaudio

# -------------------------
# 1. Setup faster-whisper
# -------------------------

MODEL_SIZE = "medium"

whisper_model = WhisperModel(
    MODEL_SIZE,
    device="cpu",      # change to "cuda" when you have a GPU
    compute_type="int8"
)


def transcribe_with_words(audio_path: str, language: str = "de") -> Dict[str, Any]:
    """
    Transcribe audio file with faster-whisper and return
    segments + word-level timestamps.
    Also prints each segment as it is produced.
    """
    segments, info = whisper_model.transcribe(
        audio_path,
        language=language,
        beam_size=5,
        word_timestamps=True,
    )

    segment_list: List[Dict[str, Any]] = []
    word_list: List[Dict[str, Any]] = []

    for seg in segments:
        # live-ish console output
        print(f"[{seg.start:.2f} - {seg.end:.2f}] {seg.text.strip()}", flush=True)

        segment_list.append(
            {
                "start": seg.start,
                "end": seg.end,
                "text": seg.text.strip(),
            }
        )

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


# -------------------------
# 2. Setup pyannote diarization
# -------------------------

HF_TOKEN = os.getenv("HF_TOKEN")
if HF_TOKEN is None:
    raise RuntimeError(
        "HF_TOKEN environment variable is not set. "
        "Create a Hugging Face token and export HF_TOKEN before running."
    )

diarization_pipeline = Pipeline.from_pretrained(
    "pyannote/speaker-diarization-community-1",
    token=HF_TOKEN,
)


def diarize_audio(audio_path: str) -> List[Dict[str, Any]]:
    """
    Run pyannote diarization and return a list of speaker segments.
    Uses torchaudio to load the waveform to avoid torchcodec/FFmpeg issues.
    """
    waveform, sample_rate = torchaudio.load(audio_path)
    audio_dict = {"waveform": waveform, "sample_rate": sample_rate}

    output = diarization_pipeline(audio_dict)

    spk_segments: List[Dict[str, Any]] = []
    for turn, speaker in output.speaker_diarization:
        spk_segments.append(
            {
                "speaker_id": speaker,          # e.g. "SPEAKER_00"
                "start": float(turn.start),
                "end": float(turn.end),
            }
        )

    return spk_segments


# -------------------------
# 3. Align words to speakers
# -------------------------

def find_speaker_for_time(t: float, spk_segments: List[Dict[str, Any]]) -> Optional[str]:
    for seg in spk_segments:
        if seg["start"] <= t <= seg["end"]:
            return seg["speaker_id"]
    return None


def build_speaker_turns(
    words: List[Dict[str, Any]],
    spk_segments: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """
    Assign speaker_id to each word based on time,
    then group consecutive words from the same speaker into turns.
    """
    enriched_words: List[Dict[str, Any]] = []
    for w in words:
        mid = (w["start"] + w["end"]) / 2
        spk_id = find_speaker_for_time(mid, spk_segments)
        if spk_id is None:
            # word outside diarization segments -> skip or handle differently
            continue

        enriched_words.append(
            {
                "start": w["start"],
                "end": w["end"],
                "word": w["word"],
                "speaker_id": spk_id,
            }
        )

    turns: List[Dict[str, Any]] = []
    current: Optional[Dict[str, Any]] = None

    for w in enriched_words:
        if current is None or current["speaker_id"] != w["speaker_id"]:
            if current is not None:
                turns.append(current)

            current = {
                "speaker_id": w["speaker_id"],
                "start": w["start"],
                "end": w["end"],
                "text": w["word"],
            }
        else:
            current["end"] = w["end"]
            current["text"] += w["word"]

    if current is not None:
        turns.append(current)

    return turns


# -------------------------
# 4. Main entry point
# -------------------------

def process_call(audio_path: str, language: str = "de") -> Dict[str, Any]:
    print("=== Transcribing with faster-whisper ===")
    stt_result = transcribe_with_words(audio_path, language=language)

    print("\n=== Running diarization with pyannote ===")
    spk_segments = diarize_audio(audio_path)

    print("\n=== Building speaker turns ===")
    turns = build_speaker_turns(stt_result["words"], spk_segments)

    return {
        "language": stt_result["language"],
        "language_probability": stt_result["language_probability"],
        "segments": stt_result["segments"],     # plain segments
        "speaker_segments": spk_segments,       # diarization segments
        "turns": turns,                         # merged speaker turns
    }


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python stt_with_diarization.py path/to/audio.(wav|mp3) [output.json]")
        raise SystemExit(1)

    audio_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) >= 3 else None

    result = process_call(audio_file, language="de")

    if output_file:
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        print(f"\nSaved JSON to {output_file}")
    else:
        print("\n--- FINAL JSON ---")
        print(json.dumps(result, ensure_ascii=False, indent=2))
