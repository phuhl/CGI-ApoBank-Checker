import { useState } from "react";
import checklist from "./checklist.json";

export const Checklist = () => {
  const [tab, setTab] = useState(0);

  const tables = Object.entries(checklist).map(([key, value]) => ({
    title: key,
    rows: value as { description: string }[],
  }));

  // const tables = [
  //   {
  //     title: "Tab 1",
  //     rows: [
  //       { a: "A1", b: "B1" },
  //       { a: "A2", b: "B2" },
  //     ],
  //   },
  //   {
  //     title: "Tab 2",
  //     rows: [
  //       { a: "C1", b: "D1" },
  //       { a: "C2", b: "D2" },
  //     ],
  //   },
  //   {
  //     title: "Tab 3",
  //     rows: [
  //       { a: "E1", b: "F1" },
  //       { a: "E2", b: "F2" },
  //     ],
  //   },
  // ];

  return (
    <div style={{ padding: 20, fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        {tables.map((t, i) => (
          <button
            key={i}
            onClick={() => setTab(i)}
            style={{
              padding: "8px 16px",
              border: "1px solid #ccc",
              background: tab === i ? "#764ba2" : undefined,
              cursor: "pointer",
            }}
          >
            {t.title}
          </button>
        ))}
      </div>

      <table
        style={{
          borderCollapse: "collapse",
          border: "none",
        }}
      >
        <thead>
          <tr>
            <th style={{ padding: 6 }}>Questions</th>
          </tr>
        </thead>
        <tbody>
          {tables[tab].rows.map((row, i) => (
            <tr key={i}>
              <td
                style={{
                  border: "1px solid #aaa",
                  padding: 6,
                  backgroundColor: "#fff",
                  color: "black",
                }}
              >
                {row.description}
              </td>
              <td
                style={{
                  border: "1px solid #aaa",
                  padding: 6,
                  backgroundColor: "#fff",
                }}
              >
                <button>Bearbeiten</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
