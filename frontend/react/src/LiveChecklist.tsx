import React from "react";

/**
 * Floating checklist widget shown in the top-left corner.
 * Displays matched checklist items live during analysis.
 */
export const LiveChecklist = ({ checklist }) => {
  if (!checklist) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "20px",
        left: "20px",
        background: "#fff",
        borderRadius: "12px",
        padding: "15px",
        boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
        width: "320px",
        zIndex: 9999,
        border: "1px solid #ddd",
      }}
    >
      <h3 style={{ margin: "0 0 10px 0", color: "#333", fontSize: "16px" }}>
        Category: {checklist.category}
      </h3>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          {checklist.matchedItems.map((item) => (
            <tr key={item.id}>
              <td style={{ padding: "4px 0", fontSize: "13px" }}>
                {item.id}
              </td>
              <td style={{ padding: "4px 0", textAlign: "right" }}>
                {item.matched ? "✔️" : "❌"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
