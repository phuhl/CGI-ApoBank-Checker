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
}) => {
  return (
    <div style={{ padding: "20px" }}>
      <h2>Analyse Ergebnis</h2>

      {props.data.compliant ? (
        <p>Der Anruf ist konform mit den Vorschriften.</p>
      ) : (
        <p>Der Anruf ist nicht konform mit den Vorschriften.</p>
      )}

      <div
        style={{
          display: "flex",
          gap: "20px",
          marginBottom: "20px",
          flexDirection: "column",
          padding: "10px",
        }}
      >
        <div
          style={{
            width: "100px",
            height: "100px",
            backgroundColor: props.data.compliant ? "grey" : "red",
            borderRadius: "100%",
          }}
        ></div>

        <div
          style={{
            width: "100px",
            height: "100px",
            borderRadius: "100%",
            backgroundColor: props.data.confident ? "green" : "grey",
          }}
        ></div>
      </div>

      <h3>Details:</h3>
      <ul>
        {props.data.fullComplianceResults.map((result, index) => (
          <li key={index} style={{ marginBottom: "15px" }}>
            <strong>Frage:</strong> {result.question} <br />
            <strong>Erfüllt:</strong> {result.exists ? "Ja" : "Nein"} <br />
            <strong>Vertrauenswürdigkeit:</strong>{" "}
            {(result.confidence * 100).toFixed(2)}% <br />
            {result.textExtract && (
              <>
                <strong>Textauszug:</strong>
                <blockquote
                  style={{
                    backgroundColor: "#f0f0f0",
                    padding: "10px",
                    borderRadius: "5px",
                  }}
                >
                  {result.textExtract}
                </blockquote>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};
