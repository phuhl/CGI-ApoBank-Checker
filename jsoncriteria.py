#!/usr/bin/env python
"""
Convert 'Kopie von 20250721_Checklisten_Sprachaufzeichnungen.xlsx'
into a JSON file with 7 cases.

Usage:
    python jsoncriteria.py input.xlsx output.json

Example:
    python jsoncriteria.py "Kopie von 20250721_Checklisten_Sprachaufzeichnungen.xlsx" checklists.json
"""

import re
import sys
import json
from typing import List, Dict, Any, Optional

import pandas as pd


# Map Excel sheet names to internal codes
CASE_CODE_BY_SHEET = {
    "Ohne Beratung gekürzt":       "OB_KURZ",
    "Ohne Beratung ausführlich":   "OB_LANG",
    "Mit Beratung Zertifikate":    "MB_ZERT",
    "Mit Beratung Fonds":          "MB_FONDS",
    "Mit Beratung Renten ":        "MB_RENTEN",   # note trailing space in sheet name
    "Mit Beratung Aktien":         "MB_AKT",
    "Mit Beratung ISP ETF":        "MB_ISP_ETF",
}

# Section headers as they appear in the sheets
SECTION_MARKERS = {
    "Vor Start der Gesprächsaufzeichnung",
    "Nach Start der Gesprächsaufzeichnung",
    "Nach Gesprächsbeendigung",
}


def extract_items_from_sheet(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Extract checklist items from one sheet.
    We use the 2nd column (index 1) which contains the text.
    Rows with section markers change the current section.
    All other non-empty rows below the first section become items.
    """
    col = df.columns[1]  # column where the checklist text is

    items: List[Dict[str, Any]] = []
    current_section: Optional[str] = None
    idx = 1  # running item index per sheet

    for _, row in df.iterrows():
        val = row[col]

        # skip empty cells
        if isinstance(val, float) and pd.isna(val):
            continue
        if not isinstance(val, str):
            continue

        text = val.strip()
        if not text:
            continue

        # NEW: strip leading "1) ", "2) ", "10) " etc. at start of line
        text = re.sub(r'^\d+\)\s*', '', text)

        # If this is a section header, update current_section
        if text in SECTION_MARKERS:
            current_section = text
            continue

        # Skip top meta rows until we have a section
        if current_section is None:
            # ignore header-ish rows like "Checkliste ...", "Berater:in:", etc.
            lower = text.lower()
            if lower.startswith("checkliste"):
                continue
            if "berater" in text or "Datum" in text or "Kundenname" in text:
                continue
            # Everything else before the first section is treated as meta and skipped
            continue

        # Normal checklist line
        items.append(
            {
                "index": idx,
                "section": current_section,
                "text": text,
            }
        )
        idx += 1

    return items


def build_checklists_json(xlsx_path: str) -> Dict[str, Any]:
    """
    Load the Excel file and build a single JSON structure:

    {
      "cases": [
        {
          "code": "MB_ZERT",
          "name": "Mit Beratung Zertifikate",
          "items": [ ... ]
        },
        ...
      ]
    }
    """
    xls = pd.ExcelFile(xlsx_path)

    cases: List[Dict[str, Any]] = []

    for sheet_name in xls.sheet_names:
        if sheet_name not in CASE_CODE_BY_SHEET:
            # If new sheets appear later, you can handle/log them instead of skipping
            continue

        code = CASE_CODE_BY_SHEET[sheet_name]
        df = xls.parse(sheet_name)

        items = extract_items_from_sheet(df)

        case = {
            "code": code,
            "name": sheet_name.strip(),  # strip trailing space on "Renten "
            "items": items,
        }
        cases.append(case)

    return {"cases": cases}


def main(argv: List[str]) -> None:
    if len(argv) < 2:
        print("Usage: python jsoncriteria.py input.xlsx [output.json]")
        sys.exit(1)

    xlsx_path = argv[1]
    output_path = argv[2] if len(argv) >= 3 else None

    data = build_checklists_json(xlsx_path)

    if output_path:
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"Written JSON to {output_path}")
    else:
        # print to stdout
        print(json.dumps(data, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main(sys.argv)

