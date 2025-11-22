from faster_whisper import WhisperModel


def get_transcript(mp3file):

    model_size = "large-v2"

    model = WhisperModel(model_size, compute_type="int8")

    print("test1")
    segments, info = model.transcribe(mp3file, beam_size=5)
    print("test2")

    print("Detected language '%s' with probability %f" % (info.language, info.language_probability))

    for segment in segments:
        print("[%.2fs -> %.2fs] %s" % (segment.start, segment.end, segment.text))