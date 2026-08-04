// AI Solve - Simple Version

const imageInput = document.getElementById("imageInput");
const solveBtn = document.getElementById("solveBtn");
const loading = document.getElementById("loading");
const result = document.getElementById("result");
const previewContainer = document.getElementById("previewContainer");

let selectedFile = null;

// Image Preview
imageInput.addEventListener("change", () => {

    selectedFile = imageInput.files[0];

    if (!selectedFile) {
        previewContainer.innerHTML = "";
        return;
    }

    const reader = new FileReader();

    reader.onload = function (e) {

        previewContainer.innerHTML = `
            <img src="${e.target.result}"
                 style="max-width:100%;border-radius:12px;margin-top:20px;">
        `;

    };

    reader.readAsDataURL(selectedFile);

});

// Solve Button
solveBtn.addEventListener("click", async () => {

    if (!selectedFile) {

        alert("Please select an image first.");

        return;

    }

    loading.style.display = "block";

    result.style.display = "none";

    const formData = new FormData();

    formData.append("image", selectedFile);

    try {

        const response = await fetch("/solve", {

            method: "POST",

            body: formData

        });

        const data = await response.json();

        loading.style.display = "none";

        result.style.display = "block";

        if (data.success) {

            result.innerHTML = `
                <h2>Answer</h2>
                <p>${data.answer.replace(/\n/g,"<br>")}</p>
            `;

        } else {

            result.innerHTML = `
                <h2>Error</h2>
                <p>${data.error}</p>
            `;

        }

    } catch (err) {

        loading.style.display = "none";

        result.style.display = "block";

        result.innerHTML = `
            <h2>Server Error</h2>
            <p>Could not connect to the server.</p>
        `;

        console.error(err);

    }

});