import { useState } from "react";
import { ShowData } from "./ShowData";

type UploadProps = {};

export const Upload = (props: UploadProps) => {
  const [data, setData] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const upload = () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    setLoading(true);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "http://localhost:3000/analyze", true);

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
        <ShowData data={data} />
      </>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "20px",
        gap: "20px",
      }}
    >
      <img src="/apobank-logo.png" alt="ApoBank Logo" className="logo" />

      <div className="container">
        <h1>Prüfung Wertpapiergeschäft</h1>

        <div className="form">
          <input
            disabled={loading}
            type="file"
            accept=".mp3,audio/mpeg"
            onChange={(e) => setFile(e.target.files[0])}
          />

          <button disabled={loading} onClick={upload}>
            {loading ? "Analyzing..." : "Upload and Analyze"}
          </button>
        </div>
      </div>
    </div>
  );
};
