const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();

app.use(cors());
app.use(express.json());

// Root route
app.get("/", (req, res) => {
  res.send("AI Doctor Backend Running with Groq...");
});

// Chat endpoint
app.post("/chat", async (req, res) => {
  try {
    const userMessage = req.body.message;
    const messagesFromFrontend = req.body.messages;

    let messages = [];

    // ✅ Support both formats
    if (messagesFromFrontend && Array.isArray(messagesFromFrontend)) {
      messages = messagesFromFrontend;
    } else if (userMessage) {
      messages = [{ role: "user", content: userMessage }];
    } else {
      return res.status(400).json({ error: "Message required" });
    }

    if (!process.env.GROQ_API_KEY) {
      return res.json({
        reply: "Server configuration issue. Please try again later.",
      });
    }

    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama3-8b-8192",
        temperature: 0.7,
        max_tokens: 500,
        messages: [
          {
            role: "system",
            content: `
You are a professional human doctor named Dr. Vetha Varshini.

STRICT FLOW:

1. If user greets → respond politely.

2. If user mentions common issues:
   fever, cold, cough, throat pain, dysentery

   DO THIS ORDER:
   - Say empathy (e.g., "Sorry to hear that...")
   - Give 2–3 simple home remedies
   - Ask 2–3 follow-up questions

3. DO NOT give medicine immediately.

4. Only after enough details → suggest medicine.

5. If you give medicine → add [MEDICINE] at end.

6. Keep responses:
   - Short
   - Natural
   - Caring
   - Doctor-like

7. If asked your name:
   - Say "My name is Dr. Vetha Varshini."
            `,
          },
          ...messages,
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      }
    );

    // ✅ Safe extraction
    let reply =
      response?.data?.choices?.[0]?.message?.content || "No response";

    // ✅ MEDICINE DETECTION
    if (reply.includes("[MEDICINE]")) {
      reply = reply.replace("[MEDICINE]", "").trim();

      reply +=
        "\n\nMoreover, I am an AI doctor assistant. For your convenience, please consult your nearby hospital doctor.";
    }

    res.json({ reply });

  } catch (err) {
    console.error("🔥 ERROR:", err.response?.data || err.message);

    res.json({
      reply:
        "Sorry, I'm having trouble responding right now. Please try again in a moment.",
    });
  }
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log("✅ Server running on port", PORT);
});
