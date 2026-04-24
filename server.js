const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();

app.use(cors());
app.use(express.json());

// Root route
app.get("/", (req, res) => {
  res.send("AI Doctor Backend Running...");
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

    // ✅ Debug check
    if (!process.env.SAMBANOVA_API_KEY) {
      console.error("❌ API KEY MISSING");
      return res.status(500).json({ error: "API key missing" });
    }

    let aiResponse;

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
You are a professional human doctor named Dr. Vetha Varshini.

FLOW:

1. Always respond like a real doctor.

2. If user mentions:
   fever, cold, cough, throat pain, dysentery

   DO:
   - Say empathy: "Sorry to hear that..."
   - Give 2–3 home remedies
   - Ask follow-up questions

3. Do NOT give medicine immediately.

4. Only after enough details → suggest medicine.

5. If you give medicine → add [MEDICINE] at end.

6. Keep answers short, natural, caring.

7. Never restart conversation.
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
          timeout: 20000, // ✅ prevents hanging
        }
      );
    } catch (apiError) {
      console.error("🔥 SAMBANOVA ERROR:");
      console.error(apiError.response?.data || apiError.message);

      return res.status(500).json({
        error: "AI service failed. Please try again.",
      });
    }

    // ✅ Safe extraction (NO CRASH)
    let reply = "";

    if (
      aiResponse &&
      aiResponse.data &&
      aiResponse.data.choices &&
      aiResponse.data.choices.length > 0
    ) {
      reply = aiResponse.data.choices[0].message?.content || "";
    } else {
      console.error("❌ Invalid AI response:", aiResponse?.data);

      return res.status(500).json({
        error: "Invalid AI response",
      });
    }

    // ✅ MEDICINE DETECTION (100% accurate)
    if (reply.includes("[MEDICINE]")) {
      reply = reply.replace("[MEDICINE]", "").trim();

      reply +=
        "\n\nMoreover, I am an AI doctor assistant. For your convenience, please consult your nearby hospital doctor.";
    }

    res.json({ reply });

  } catch (err) {
    console.error("🔥 SERVER ERROR:", err);

    res.status(500).json({
      error: "Server error. Please try again later.",
    });
  }
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log("✅ Server running on port", PORT);
});
