import os
import warnings
warnings.filterwarnings("ignore", category=UserWarning)

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
    device="cpu",      # change to "cuda" on GPU
    compute_type="float32"
)


def transcribe_segments(audio_path: str, language: str = "de") -> Dict[str, Any]:
    """
    Transcribe audio file with faster-whisper and return
    only segment-level timestamps + text.
    We don't need word-level timestamps for speaker mapping now.
    """
    segments, info = whisper_model.transcribe(
        audio_path,
        language=language,
        beam_size=5,
        word_timestamps=False,   # IMPORTANT: we only use segments now
    )

    segment_list: List[Dict[str, Any]] = []

    for seg in segments:
        # live-ish console output
       # print(f"[{seg.start:.2f} - {seg.end:.2f}] {seg.text.strip()}", flush=True)

        segment_list.append(
            {
                "start": float(seg.start),
                "end": float(seg.end),
                "text": seg.text.strip(),
            }
        )

    return {
        "language": info.language,
        "language_probability": info.language_probability,
        "segments": segment_list,
    }


# -------------------------
# 2. Setup pyannote diarization
# -------------------------

HF_TOKEN = "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"
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

    # sort by start time just in case
    spk_segments.sort(key=lambda s: s["start"])
    return spk_segments


# -------------------------
# 3. Assign speaker to each Whisper segment
# -------------------------

def _overlap(a_start: float, a_end: float, b_start: float, b_end: float) -> float:
    """Duration of overlap between [a_start, a_end] and [b_start, b_end] (>= 0)."""
    start = max(a_start, b_start)
    end = min(a_end, b_end)
    return max(0.0, end - start)


def assign_speakers_to_segments(
    segments: List[Dict[str, Any]],
    spk_segments: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """
    For each Whisper segment, decide which speaker talks there,
    based on maximum time overlap with diarization segments.
    """
    segments_with_speaker: List[Dict[str, Any]] = []

    for seg in segments:
        seg_start = seg["start"]
        seg_end = seg["end"]

        # accumulate overlap duration per speaker
        overlap_by_speaker: Dict[str, float] = {}

        for spk_seg in spk_segments:
            ov = _overlap(seg_start, seg_end, spk_seg["start"], spk_seg["end"])
            if ov <= 0:
                continue
            spk_id = spk_seg["speaker_id"]
            overlap_by_speaker[spk_id] = overlap_by_speaker.get(spk_id, 0.0) + ov

        if overlap_by_speaker:
            # choose speaker with max overlap
            best_speaker = max(overlap_by_speaker.items(), key=lambda kv: kv[1])[0]
        else:
            # fallback: choose nearest diarization segment by center time
            mid = 0.5 * (seg_start + seg_end)
            nearest = min(
                spk_segments,
                key=lambda s: abs(0.5 * (s["start"] + s["end"]) - mid),
            )
            best_speaker = nearest["speaker_id"]

        new_seg = {
            "start": seg_start,
            "end": seg_end,
            "text": seg["text"],
            "speaker_id": best_speaker,
        }
        segments_with_speaker.append(new_seg)

    return segments_with_speaker


# -------------------------
# 4. Merge consecutive segments with same speaker into "turns"
# -------------------------

def merge_segments_by_speaker(
    segments_with_speaker: List[Dict[str, Any]],
    max_gap: float = 1.0,
) -> List[Dict[str, Any]]:
    """
    Merge consecutive Whisper segments that have the same speaker_id
    and are not too far apart in time.
    """
    if not segments_with_speaker:
        return []

    # segments should already be in chronological order
    turns: List[Dict[str, Any]] = []
    current: Optional[Dict[str, Any]] = None

    for seg in segments_with_speaker:
        if current is None:
            current = {
                "speaker_id": seg["speaker_id"],
                "start": seg["start"],
                "end": seg["end"],
                "text": seg["text"],
            }
            continue

        same_speaker = (seg["speaker_id"] == current["speaker_id"])
        small_gap = (seg["start"] - current["end"] <= max_gap)

        if same_speaker and small_gap:
            # extend current turn
            current["end"] = seg["end"]
            # add a space so texts don't glue together
            current["text"] = current["text"].rstrip() + " " + seg["text"].lstrip()
        else:
            # close current turn and start a new one
            turns.append(current)
            current = {
                "speaker_id": seg["speaker_id"],
                "start": seg["start"],
                "end": seg["end"],
                "text": seg["text"],
            }

    if current is not None:
        turns.append(current)

    return turns


# -------------------------
# 5. Main entry point
# -------------------------

def process_call(audio_path: str, language: str = "de") -> Dict[str, Any]:
    #print("=== Transcribing with faster-whisper ===")
    stt_result = transcribe_segments(audio_path, language=language)

    #print("\n=== Running diarization with pyannote ===")
    spk_segments = diarize_audio(audio_path)

    #print("\n=== Assigning speakers to Whisper segments ===")
    segments_with_speaker = assign_speakers_to_segments(stt_result["segments"], spk_segments)

    #print("\n=== Building speaker turns ===")
    turns = merge_segments_by_speaker(segments_with_speaker)

    return {"turns": turns}
    '''
    {
        #"language": stt_result["language"],
        #"language_probability": stt_result["language_probability"],
        #"segments": stt_result["segments"],           # raw Whisper segments
        #"speaker_segments": spk_segments,             # raw diarization segments
        #"segments_with_speaker": segments_with_speaker,  # Whisper segments + speaker_id
        "turns": turns,                               # merged turns per speaker
    }
    '''

if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
       # print("Usage: python stt_with_diarization.py path/to/audio.(wav|mp3) [output.json]")
        raise SystemExit(1)

    audio_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) >= 3 else None

    result = process_call(audio_file, language="de")

    if output_file:
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        #print(f"\nSaved JSON to {output_file}")
    else:
        #print("\n--- FINAL JSON ---")
        #print(json.dumps(result, ensure_ascii=False, indent=2))
        print(result)
