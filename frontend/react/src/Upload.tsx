import { useState } from "react";
import { ShowData } from "./ShowData";

import { Checklist } from "./Checklist";

export const Upload = () => {
  const [data, setData] = useState(null);
  const [file, setFile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [updateChecklist, setUpdateChecklist] = useState(false);

  const upload = () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    setLoading(true);

    const xhr = new XMLHttpRequest();

    xhr.open(
      "POST",
      `http://${location.host.split(":")[0]}:3000/analyze`,
      true
    );

    xhr.onload = () => {
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText);
        setData(response);
        console.log("Analysis Result:", response);
      } else {
        console.error("Error:", xhr.status, xhr.responseText);
      }
      setLoading(false);
    };

    xhr.send(formData);
  };

  if (updateChecklist) {
    return (
      <>
        <button
          style={{ marginTop: "20px" }}
          onClick={() => {
            setUpdateChecklist(false);
          }}
        >
          Zurück
        </button>
        <Checklist />
      </>
    );
  }

  if (data) {
    return (
      <>
        <button
          style={{ marginTop: "20px" }}
          onClick={() => {
            setData(null);
            setFile(null);
          }}
        >
          Zurück
        </button>
        <ShowData data={data} fileName={file?.name} />
      </>
    );
  }

  return (
    <div>
      <button
        onClick={() => setUpdateChecklist(true)}
        style={{ position: "absolute", top: 20, right: 20 }}
      >
        Checkliste Anpassen
      </button>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "20px",
          gap: "20px",
        }}
      >
        <img src="/apo-full-logo.png" alt="ApoBank Logo" className="logo" />

        <div className="container">
          <h1>Prüfung Wertpapiergeschäft</h1>

          <div className="form">
            <label
              htmlFor="file-upload"
              style={{
                padding: "15px 20px",
                border: "2px dashed #667eea",
                borderRadius: "12px",
                background: "#f8f9ff",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.3s ease",
                fontSize: "14px",
                color: "#000",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "15px",
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.borderColor = "#764ba2";
                  e.currentTarget.style.background = "#f0f2ff";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#667eea";
                e.currentTarget.style.background = "#f8f9ff";
              }}
            >
              <span style={{ fontWeight: "600", color: "#667eea" }}>
                📁 Datei auswählen
              </span>
              {file && (
                <span
                  style={{
                    color: "#000",
                    fontSize: "13px",
                    flex: 1,
                    textAlign: "right",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {file.name}
                </span>
              )}
              {!file && (
                <span style={{ color: "#999", fontSize: "13px" }}>
                  Keine Datei ausgewählt
                </span>
              )}
            </label>
            <input
              id="file-upload"
              disabled={loading}
              type="file"
              accept=".mp3,audio/mpeg"
              onChange={(e) => setFile(e?.target?.files?.[0] || null)}
              style={{ display: "none" }}
            />

            <button disabled={loading} onClick={upload}>
              {loading ? "Analyzing..." : "Upload and Analyze"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
