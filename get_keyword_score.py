from pathlib import Path
import trint_use 
import json
#import numpy as np

file_path_trans = "output1.json"
file_path_keywords = "keywords.json"

# keywords da tf-idf nicht moeglich

def softmax(values):
    if not values:
        return []

    max_v = max(values) 
    exps = [3**(v - max_v) for v in values]
    total = sum(exps)
    return [e / total for e in exps]


def calc_keyword_score(key_file, trans_file):
    all_key_values = []
    dialog_types = []

    for dialog_type, keylist in key_file.items():
        dialog_types.append(dialog_type)
        dialog_type_count = 0

        for seg in trans_file:
            text = seg.get("text", "").lower()

            for key in keylist:
                if key.lower() in text:
                    dialog_type_count += 1

        all_key_values.append(dialog_type_count)

    total = sum(all_key_values)
    for i,dt in enumerate(dialog_types):
        print(f"{dt}: {all_key_values[i]/total}")
    return dialog_types, all_key_values



print("test")
with open(file_path_keywords, "r", encoding="utf-8") as f:
    key_file = json.load(f)

print("test")
with open(file_path_trans, "r", encoding="utf-8") as f:
    trans_file = json.load(f)

print("test")
print(trans_file)
trans_file = trans_file["segments_with_speaker"]
print("test")
calc_keyword_score(key_file, trans_file)
    