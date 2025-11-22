import os
os.environ["TORCH_CPP_LOG_LEVEL"] = "ERROR"
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

    We treat all calls as 2-person conversations (advisor + client), so we
    fix the number of speakers to 2 via min_speakers / max_speakers.
    Uses torchaudio to load the waveform to avoid torchcodec/FFmpeg issues.
    """
    waveform, sample_rate = torchaudio.load(audio_path)
    audio_dict = {"waveform": waveform, "sample_rate": sample_rate}

    # Two-person call: enforce exactly 2 speakers
    output = diarization_pipeline(
        audio_dict,
        min_speakers=2,
        max_speakers=2,
    )

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
# 3. Assign speaker to each Whisper segment (with splitting)
# -------------------------

def _overlap(a_start: float, a_end: float, b_start: float, b_end: float) -> float:
    """Duration of overlap between [a_start, a_end] and [b_start, b_end] (>= 0)."""
    start = max(a_start, b_start)
    end = min(a_end, b_end)
    return max(0.0, end - start)


def split_segment_by_speaker(
    seg: Dict[str, Any],
    spk_segments: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Split a single Whisper segment into multiple chunks
    whenever different speakers occur inside its time range.

    Text is divided approximately proportionally to the duration
    of each speaker's overlap with the segment.
    """
    seg_start = seg["start"]
    seg_end = seg["end"]
    text = seg["text"]
    words = text.split()

    if not words:
        return []

    # Collect all diarization chunks that overlap this Whisper segment
    overlaps: List[Dict[str, Any]] = []
    for spk_seg in spk_segments:
        o_start = max(seg_start, spk_seg["start"])
        o_end = min(seg_end, spk_seg["end"])
        if o_end > o_start:
            overlaps.append(
                {
                    "start": o_start,
                    "end": o_end,
                    "speaker_id": spk_seg["speaker_id"],
                }
            )

    # No overlap at all -> fallback: assign whole segment
    # to the diarization segment whose center is closest.
    if not overlaps:
        mid = 0.5 * (seg_start + seg_end)
        nearest = min(
            spk_segments,
            key=lambda s: abs(0.5 * (s["start"] + s["end"]) - mid),
        )
        new_seg = dict(seg)
        new_seg["speaker_id"] = nearest["speaker_id"]
        return [new_seg]

    # Only one speaker overlapping -> do not split, just attach speaker_id.
    if len(overlaps) == 1:
        new_seg = dict(seg)
        new_seg["speaker_id"] = overlaps[0]["speaker_id"]
        return [new_seg]

    # Sort overlaps by time to ensure consistent order
    overlaps.sort(key=lambda o: o["start"])

    total_dur = sum(o["end"] - o["start"] for o in overlaps)
    n_words = len(words)

    # Ideal (float) word counts per overlapping chunk
    raw_counts = [
        (o["end"] - o["start"]) / total_dur * n_words for o in overlaps
    ]

    # Start with rounded counts, at least 1 word per chunk
    int_counts = [max(1, int(round(c))) for c in raw_counts]
    diff = sum(int_counts) - n_words

    # If we allocated too many words, remove some from the biggest chunks
    while diff > 0 and any(c > 1 for c in int_counts):
        idx = max(range(len(int_counts)), key=lambda i: int_counts[i])
        if int_counts[idx] > 1:
            int_counts[idx] -= 1
            diff -= 1
        else:
            break

    # If we allocated too few words, add to the longest-duration chunk(s)
    while diff < 0:
        idx = max(
            range(len(int_counts)),
            key=lambda i: overlaps[i]["end"] - overlaps[i]["start"],
        )
        int_counts[idx] += 1
        diff += 1

    # Actually slice the text according to int_counts
    out_segments: List[Dict[str, Any]] = []
    cursor = 0
    for count, o in zip(int_counts, overlaps):
        if cursor >= n_words:
            break
        take = min(count, n_words - cursor)
        part_words = words[cursor: cursor + take]
        cursor += take

        if not part_words:
            continue

        out_segments.append(
            {
                "start": o["start"],
                "end": o["end"],
                "text": " ".join(part_words),
                "speaker_id": o["speaker_id"],
            }
        )

    # If there are leftover words (due to rounding), append them
    # to the last sub-segment.
    if cursor < n_words and out_segments:
        out_segments[-1]["text"] = out_segments[-1]["text"].rstrip() + " " + " ".join(
            words[cursor:]
        )

    return out_segments


def assign_speakers_to_segments(
    segments: List[Dict[str, Any]],
    spk_segments: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """For each Whisper segment, split it into smaller pieces when
    multiple speakers are present, and attach speaker_id.

    The result is a flat, time-sorted list of segments, each with
    start, end, text, and speaker_id. This avoids unrealistic
    60+ second "monologues" when speakers are actually alternating.
    """
    segments_with_speaker: List[Dict[str, Any]] = []

    for seg in segments:
        sub_segments = split_segment_by_speaker(seg, spk_segments)
        segments_with_speaker.extend(sub_segments)

    # Ensure chronological order
    segments_with_speaker.sort(key=lambda s: s["start"])
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

    return {"segments_with_speaker": segments_with_speaker}
    # or, if you ever want turns instead:
    # return {"turns": turns}


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
