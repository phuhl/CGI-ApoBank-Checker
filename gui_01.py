from pathlib import Path
from PyQt6.QtWidgets import (
    QApplication,
    QFileDialog,
    QLabel,
    QMessageBox,
    QPushButton,
    QVBoxLayout,
    QWidget,
)

from text2speech_func import get_transcript


def process_mp3(file_path: str) -> None:
    print("get_transcript")
    get_transcript(file_path)


def format_path_for_label(path: str, max_len: int = 60) -> str:
    if len(path) <= max_len:
        return path
    p = Path(path)
    shortened = f".../{p.parent.name}/{p.name}"
    return shortened if len(shortened) <= max_len else f".../{p.name}"


def build_window(app: QApplication) -> QWidget:
    window = QWidget()
    window.setWindowTitle("MP3 auswählen")
    window.resize(520, 180)

    selected_label = QLabel("Noch keine Datei gewählt")
    status_label = QLabel("")

    def choose_file() -> None:
        file_path, _ = QFileDialog.getOpenFileName(
            window,
            "MP3-Datei auswählen",
            "",
            "MP3 Dateien (*.mp3);;Alle Dateien (*)",
        )
        if not file_path:
            return

        selected_label.setText(format_path_for_label(file_path))
        try:

            status_label.setText("Berechene")
            process_mp3(file_path)
        except Exception as exc:
            status_label.setText("Fehler bei der Verarbeitung.")
            QMessageBox.critical(window, "Fehler", str(exc))

    button = QPushButton("Datei im Finder wählen")
    button.clicked.connect(choose_file)

    layout = QVBoxLayout()
    layout.addWidget(QLabel("Wähle eine MP3-Datei aus"))
    layout.addWidget(button)
    layout.addWidget(selected_label)
    layout.addWidget(status_label)

    window.setLayout(layout)
    return window


def main() -> None:
    app = QApplication([])
    window = build_window(app)
    window.show()
    app.exec()


if __name__ == "__main__":
    main()
