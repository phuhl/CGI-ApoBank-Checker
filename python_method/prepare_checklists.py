import json
import pandas as pd
from pathlib import Path

EXCEL_PATH = Path("checklisten_sprachaufzeichnungen.xlsx")
OUTPUT_PATH = Path("checklists.json")

def normalize_key(sheet_name: str) -> str:
    name = sheet_name.strip().lower()
    replacements = {
        "ö": "oe",
        "ä": "ae",
        "ü": "ue",
        "ß": "ss",
        " ": "_",
    }
    for k, v in replacements.items():
        name = name.replace(k, v)
    return name

def build_checklists():
    if not EXCEL_PATH.exists():
        raise FileNotFoundError(f"Excel-Datei nicht gefunden: {EXCEL_PATH}")

    xls = pd.ExcelFile(EXCEL_PATH)
    all_checklists = {}

    for sheet in xls.sheet_names:
        df = pd.read_excel(xls, sheet_name=sheet)

        items = []
        # فرض: متن‌ها در ستون دوم هستند (index = 1)
        for value in df.iloc[:, 1].dropna():
            text = str(value).strip()
            # آیتم‌هایی که با عدد + ")" شروع می‌شوند را می‌گیریم، مثل "1) ..."
            if text and text[0].isdigit() and ")" in text[:5]:
                items.append(text)

        key = normalize_key(sheet)
        all_checklists[key] = [
            {
                "id": f"item_{i+1}",
                "description": item
            }
            for i, item in enumerate(items)
        ]
        print(f"{sheet} -> {key}: {len(items)} items")

    OUTPUT_PATH.write_text(
        json.dumps(all_checklists, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"✔ checklists written to {OUTPUT_PATH}")

if __name__ == "__main__":
    build_checklists()
