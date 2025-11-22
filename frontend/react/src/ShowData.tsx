export const ShowData = (props: {
  data: {
    textType: string;
    compliant: boolean;
    confident: boolean;
    fullComplianceResults: {
      question: string;
      answeredExists: number;
      answeredMissing: number;
      exists: boolean;
      confidence: number;
      textExtract?: string;
    }[];
  };
  fileName?: string;
}) => {
  // Neue Logik: Rot wenn mindestens ein "Nein", Grün nur wenn alle "Ja"
  const hasAnyNo = props.data.fullComplianceResults.some(
    (result) => !result.exists
  );
  const allYes = props.data.fullComplianceResults.every(
    (result) => result.exists
  );

  // Ampel-Farbe bestimmen
  const getTrafficLightColor = () => {
    if (hasAnyNo) return "#ef4444"; // Rot wenn mindestens eine Prüfung = Nein
    if (allYes) return "#22c55e"; // Grün nur wenn alle = Ja
    return "#eab308"; // Gelb für unklare Fälle
  };

  const trafficLightColor = getTrafficLightColor();

  const analysisDate = new Date().toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const totalQuestions = props.data.fullComplianceResults.length;
  const unansweredQuestions = props.data.fullComplianceResults.filter(
    (result) => !result.exists
  ).length;
  const answeredQuestions = totalQuestions - unansweredQuestions;

  const downloadReport = () => {
    const reportData = {
      fileName: props.fileName,
      textType: props.data.textType,
      compliant: allYes && !hasAnyNo,
      timestamp: new Date().toISOString(),
      results: props.data.fullComplianceResults,
    };

    const jsonString = JSON.stringify(reportData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    const baseFileName = props.fileName?.replace(/\.[^/.]+$/, "") || "Analyse";
    link.download = `Bericht_${baseFileName}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "20px",
        gap: "30px",
        minHeight: "100vh",
      }}
    >
      <img src="/apo-full-logo.png" alt="ApoBank Logo" className="logo" />

      {/* Obere Hälfte: Ergebnis-Container */}
      <div className="container" style={{ width: "80%", maxWidth: "1200px" }}>
        <h1 style={{ marginBottom: "20px", color: "#000" }}>Analyse Ergebnis</h1>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "30px",
            padding: "30px",
            backgroundColor: "#f8f9ff",
            borderRadius: "12px",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              width: "120px",
              height: "120px",
              backgroundColor: trafficLightColor,
              borderRadius: "100%",
              border: "4px solid #333",
              boxShadow: `0 0 30px ${trafficLightColor}`,
            }}
          ></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "24px", fontWeight: "700", marginBottom: "10px", color: "#000" }}>
              {trafficLightColor === "#22c55e" && "🟢 Alle Prüfungen erfüllt"}
              {trafficLightColor === "#ef4444" &&
                "🔴 Mindestens eine Prüfung nicht erfüllt"}
              {trafficLightColor === "#eab308" && "🟡 Teilweise erfüllt"}
            </div>
            <p style={{ fontSize: "18px", color: "#000", margin: 0, fontWeight: "500" }}>
              {allYes && !hasAnyNo
                ? "Der Anruf ist konform mit den Vorschriften."
                : "Der Anruf ist nicht konform mit den Vorschriften."}
            </p>
            {props.fileName && (
              <p style={{ fontSize: "14px", color: "#666", marginTop: "8px" }}>
                📄 Analysierte Datei: <strong style={{ color: "#000" }}>{props.fileName}</strong>
              </p>
            )}
            <p style={{ fontSize: "16px", color: "#333", marginTop: "10px" }}>
              Gesprächstyp: <strong style={{ color: "#000" }}>{props.data.textType}</strong>
            </p>
            <p style={{ fontSize: "14px", color: "#666", marginTop: "8px" }}>
              Analysiert am: <strong style={{ color: "#000" }}>{analysisDate}</strong>
            </p>
            <p style={{ fontSize: "14px", color: "#666", marginTop: "8px" }}>
              Prüfungsergebnis: <strong style={{ color: "#000" }}>{answeredQuestions} von {totalQuestions} Fragen erfüllt</strong>
              {unansweredQuestions > 0 && (
                <span style={{ color: "#ef4444", marginLeft: "10px" }}>
                  ({unansweredQuestions} nicht erfüllt)
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Untere Hälfte: Scrollbarer Bericht-Container */}
      <div
        className="container"
        style={{
          width: "80%",
          maxWidth: "1200px",
          maxHeight: "500px",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <h2 style={{ marginBottom: "20px", paddingBottom: "15px", borderBottom: "2px solid #e5e7eb", color: "#000" }}>
          Detaillierter Bericht
        </h2>

        <button
          onClick={downloadReport}
          style={{
            alignSelf: "flex-end",
            marginBottom: "15px",
            padding: "12px 24px",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "600",
            boxShadow: "0 2px 8px rgba(102, 126, 234, 0.3)",
            transition: "all 0.3s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.5)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 2px 8px rgba(102, 126, 234, 0.3)";
          }}
        >
          📥 Bericht als JSON herunterladen
        </button>
        
        <div
          style={{
            overflowY: "auto",
            padding: "20px",
            backgroundColor: "#f9fafb",
            borderRadius: "12px",
            flex: 1,
          }}
        >
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {props.data.fullComplianceResults.map((result, index) => (
              <li
                key={index}
                style={{
                  marginBottom: "20px",
                  padding: "20px",
                  backgroundColor: "white",
                  borderRadius: "8px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  borderLeft: `4px solid ${result.exists ? "#22c55e" : "#ef4444"}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                  <span style={{ fontSize: "24px" }}>
                    {result.exists ? "✅" : "❌"}
                  </span>
                  <strong style={{ fontSize: "16px", color: "#000" }}>
                    Frage {index + 1}:
                  </strong>
                </div>
                
                <p style={{ fontSize: "15px", color: "#000", marginBottom: "12px", lineHeight: "1.6" }}>
                  {result.question}
                </p>

                <div style={{ display: "flex", gap: "20px", marginBottom: "10px", fontSize: "14px", color: "#000" }}>
                  <div>
                    <strong>Erfüllt:</strong>{" "}
                    <span style={{ color: result.exists ? "#22c55e" : "#ef4444", fontWeight: "600" }}>
                      {result.exists ? "Ja" : "Nein"}
                    </span>
                  </div>
                  <div>
                    <strong>Vertrauenswürdigkeit:</strong>{" "}
                    <span style={{ color: result.confidence >= 0.7 ? "#22c55e" : "#eab308", fontWeight: "600" }}>
                      {(result.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                {result.textExtract && (
                  <div style={{ marginTop: "15px" }}>
                    <strong style={{ fontSize: "14px", color: "#000" }}>Textauszug:</strong>
                    <blockquote
                      style={{
                        backgroundColor: "#f0f2ff",
                        padding: "15px",
                        borderRadius: "8px",
                        marginTop: "8px",
                        borderLeft: "3px solid #667eea",
                        fontStyle: "italic",
                        color: "#000",
                        fontSize: "14px",
                        lineHeight: "1.6",
                      }}
                    >
                      {result.textExtract}
                    </blockquote>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
