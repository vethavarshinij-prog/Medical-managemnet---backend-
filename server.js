const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("AI Doctor Backend Running...");
});

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

    if (!process.env.SAMBANOVA_API_KEY) {
      return res.status(500).json({ error: "API key missing" });
    }

    // 🔁 Retry logic (VERY IMPORTANT)
    let aiResponse;
    let attempts = 0;

    while (attempts < 2) {
      try {
        aiResponse = await axios.post(
          "https://api.sambanova.ai/v1/chat/completions",
          {
            model: "Llama-4-Maverick-17B-128E-Instruct",
            stream: false,
            messages: [
              {
                role: "system",
                content: `
You are Dr. Vetha Varshini.

Flow:
- Empathy first
- Give home remedies
- Ask questions
- Then medicine later
- Add [MEDICINE] if medicine given
                `,
              },
              ...messages,
            ],
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.SAMBANOVA_API_KEY}`,
              "Content-Type": "application/json",
            },
            timeout: 15000,
          }
        );

        break; // success → exit loop
      } catch (err) {
        attempts++;
        console.log("Retry attempt:", attempts);

        if (attempts >= 2) {
          console.error("Sambanova failed:", err.response?.data || err.message);

          // ✅ FALLBACK RESPONSE (NO 500)
          return res.json({
            reply:
              "Sorry, I'm having trouble responding right now. Please try again in a moment.",
          });
        }
      }
    }

    let reply =
      aiResponse?.data?.choices?.[0]?.message?.content || "No response";

    // ✅ Medicine detection
    if (reply.includes("[MEDICINE]")) {
      reply = reply.replace("[MEDICINE]", "").trim();
      reply +=
        "\n\nMoreover, I am an AI doctor assistant. For your convenience, please consult your nearby hospital doctor.";
    }

    res.json({ reply });

  } catch (err) {
    console.error("SERVER ERROR:", err);

    // ✅ NEVER send 500 to frontend
    res.json({
      reply:
        "Sorry, something went wrong. Please try again after a moment.",
    });
  }
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
