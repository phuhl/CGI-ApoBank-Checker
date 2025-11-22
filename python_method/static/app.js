document.getElementById("uploadBtn").addEventListener("click", async () => {
    const fileInput = document.getElementById("audioFile");
    const file = fileInput.files[0];

    if (!file) {
        alert("Please select an audio file first.");
        return;
    }

    const loading = document.getElementById("loading");
    const resultBox = document.getElementById("result");

    loading.classList.remove("hidden");
    resultBox.classList.add("hidden");

    const formData = new FormData();
    formData.append("audio_file", file);

    try {
        const response = await fetch("/analyze_call/", {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        loading.classList.add("hidden");
        resultBox.classList.remove("hidden");

        // Fill UI fields
        document.getElementById("convType").innerText = data.conversation_type;
        document.getElementById("ampel").innerText = data.ampel;
        document.getElementById("coverage").innerText = (data.coverage * 100).toFixed(2) + "%";

        // Fill checklist table
        const tbody = document.querySelector("#checklistTable tbody");
        tbody.innerHTML = "";

        data.items.forEach(item => {
            const row = document.createElement("tr");

            row.innerHTML = `
                <td>${item.text}</td>
                <td>${item.status}</td>
                <td>${item.evidence}</td>
            `;

            tbody.appendChild(row);
        });

        // TXT download
        document.getElementById("downloadTxt").onclick = () => {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "text/plain" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = "call_report.txt";
            link.click();
        };

        // Excel download
        document.getElementById("downloadExcel").onclick = () => {
            const rows = [
                ["Item", "Status", "Evidence"],
                ...data.items.map(i => [i.text, i.status, i.evidence])
            ];

            let csvContent = rows.map(e => e.join(",")).join("\n");

            const blob = new Blob([csvContent], { type: "text/csv" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = "call_report.csv";
            link.click();
        };

    } catch (error) {
        loading.classList.add("hidden");
        alert("Error processing audio.");
    }
});
