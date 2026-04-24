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

    if (messagesFromFrontend && Array.isArray(messagesFromFrontend)) {
      messages = messagesFromFrontend;
    } else if (userMessage) {
      messages = [{ role: "user", content: userMessage }];
    } else {
      return res.status(400).json({ error: "Message required" });
    }

    console.log("🔑 GROQ KEY PRESENT:", !!process.env.GROQ_API_KEY);
    console.log("📩 Incoming message:", messages);

    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        // ✅ FIXED MODEL
        model: "meta-llama/llama-4-scout-17b-16e-instruct",

        temperature: 0.7,
        max_tokens: 500,
        messages: [
          {
            role: "system",
            content: `
You are a professional human doctor named Dr. Vetha Varshini.

Rules:
- Speak like a real doctor
- First give simple home remedies if applicable
- Then ask relevant questions
- Only later suggest medicines if needed
- If you give medicine, include [MEDICINE]
- If asked your name, say: My name is Dr. Vetha Varshini
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
        timeout: 20000,
      }
    );

    console.log("✅ GROQ RESPONSE RECEIVED");

    let reply =
      response?.data?.choices?.[0]?.message?.content || "No response";

    console.log("🤖 AI Reply:", reply);

    // ✅ MEDICINE CHECK
    if (reply.includes("[MEDICINE]")) {
      reply = reply.replace("[MEDICINE]", "").trim();

      reply +=
        "\n\nMoreover, I am an AI doctor assistant. For your convenience, please consult your nearby hospital doctor.";
    }

    res.json({ reply });

  } catch (err) {
    console.error("🔥 FULL ERROR:");
    console.error(err.response?.data || err.message);

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
