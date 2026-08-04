require("dotenv").config();

if (process.env.GEMINI_API_KEY) {
    console.log("✅ API Key successfully loaded from .env file!");
} else {
    console.log("❌ ERROR: Could not find API Key. Check your .env file!");
}

const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const { GoogleGenAI } = require("@google/genai");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

const upload = multer({ dest: "uploads/" });

const ai = new GoogleGenAI({ 
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
        headers: {
            "x-goog-api-key": process.env.GEMINI_API_KEY
        }
    }
});

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// Helper function to retry if the model is overloaded (503 / UNAVAILABLE)
async function generateWithRetry(payload, retries = 3, delay = 2000) {
    for (let i = 0; i < retries; i++) {
        try {
            return await ai.models.generateContent(payload);
        } catch (error) {
            const isOverloaded = error.status === 503 || error.message?.includes("503") || error.message?.includes("overloaded");
            if (isOverloaded && i < retries - 1) {
                console.log(`Model busy (503). Retrying attempt ${i + 2} in ${delay / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; // Double the wait time for the next try
            } else {
                throw error;
            }
        }
    }
}

app.post("/solve", upload.single("image"), async (req, res) => {
    try {
        if (!req.file) {
            return res.json({
                success: false,
                error: "No image uploaded."
            });
        }

        const imageBuffer = fs.readFileSync(req.file.path);
        const imageBase64 = imageBuffer.toString("base64");

        const prompt = `
You are an AI Homework Solver for students.
Read the uploaded homework image carefully and solve every question.

CRITICAL FORMATTING RULES:
- Provide direct, simple mathematical equations or text answers like: 1+1=2.
- Do NOT use markdown symbols, hashes (#), bold asterisks (**), or LaTeX math block tags ($ or $$).
- Keep everything as ultra-simple plain text.
`;

        const response = await generateWithRetry({
            model: 'gemini-3.6-flash',
            contents: [
                {
                    inlineData: {
                        mimeType: req.file.mimetype,
                        data: imageBase64
                    }
                },
                prompt
            ]
        });

        const answer = response.text;

        fs.unlinkSync(req.file.path);

        return res.json({
            success: true,
            answer
        });

    } catch (error) {
        console.error("FULL SOLVE ERROR DETAILS:", error);

        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        return res.status(500).json({
            success: false,
            error: "The AI is currently busy due to high traffic. Please wait a few seconds and click solve again!"
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});