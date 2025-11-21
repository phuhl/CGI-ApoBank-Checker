# diarize_only.py

import os
from pyannote.audio import Pipeline
import torchaudio


def main(audio_path: str):
    hf_token = os.getenv("HF_TOKEN")
    if hf_token is None:
        raise RuntimeError(
            "HF_TOKEN environment variable is not set. "
            "Create a Hugging Face token and export HF_TOKEN first."
        )

    pipeline = Pipeline.from_pretrained(
        "pyannote/speaker-diarization-community-1",
        token=hf_token,
    )

    # load audio into memory (avoids torchcodec/FFmpeg issue)
    waveform, sample_rate = torchaudio.load(audio_path)
    audio_dict = {"waveform": waveform, "sample_rate": sample_rate}

    # NEW: call pipeline → DiarizeOutput
    output = pipeline(audio_dict)
    print(output.json().keys())
    print(output)

    # NEW: iterate over output.speaker_diarization (no itertracks)
    for turn, speaker in output.speaker_diarization:
        print(f"{turn.start:.2f} {turn.end:.2f} {speaker}")


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python diarize_only.py path/to/audio.mp3")
        raise SystemExit(1)

    main(sys.argv[1])