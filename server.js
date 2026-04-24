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

    // 🔍 DEBUG: Check API key
    console.log("🔑 GROQ KEY PRESENT:", !!process.env.GROQ_API_KEY);

    if (!process.env.GROQ_API_KEY) {
      console.error("❌ GROQ API KEY MISSING");
      return res.json({
        reply: "Server configuration issue: API key missing.",
      });
    }

    console.log("📩 Incoming message:", messages);

    // 🔥 API CALL
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

- Speak like a real doctor
- Give home remedies first
- Ask questions
- Then give medicine later
- If medicine given add [MEDICINE]
- If asked name say: My name is Dr. Vetha Varshini
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

    console.log("✅ GROQ RESPONSE RECEIVED");

    // ✅ Safe extraction
    let reply =
      response?.data?.choices?.[0]?.message?.content || "No response";

    console.log("🤖 AI Reply:", reply);

    // ✅ MEDICINE DETECTION
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
