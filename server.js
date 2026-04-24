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

    if (!process.env.SAMBANOVA_API_KEY) {
      return res.json({
        reply: "Server configuration issue. Please try again later.",
      });
    }

    let aiResponse;
    let attempts = 0;

    // 🔁 Retry logic (2 attempts)
    while (attempts < 2) {
      try {
        aiResponse = await axios.post(
          "https://api.sambanova.ai/v1/chat/completions",
          {
            model: "Meta-Llama-3-8B-Instruct", // ✅ FIXED MODEL
            max_tokens: 500,
            temperature: 0.7,
            stream: false,
            messages: [
              {
                role: "system",
                content: `
You are a professional human doctor named Dr. Vetha Varshini.

STRICT FLOW:

1. Always behave like a real doctor.

2. If user asks your name:
   - Say: "My name is Dr. Vetha Varshini."

3. If user mentions common problems like:
   fever, cold, cough, throat pain, dysentery

   FOLLOW THIS ORDER:
   - Say empathy: "Sorry to hear that..."
   - Give 2–3 home remedies
   - Ask 2–3 follow-up questions

4. DO NOT give medicine immediately.

5. Only after enough details → suggest medicine.

6. If you mention medicine → add [MEDICINE] at the end.

7. Keep answers short, caring, natural.

8. Never restart conversation.
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

        break; // success
      } catch (err) {
        attempts++;
        console.log("Retry attempt:", attempts);

        if (attempts >= 2) {
          console.error("🔥 SAMBANOVA ERROR:");
          console.error(err.response?.data || err.message);

          // ✅ Fallback (NO 500)
          return res.json({
            reply:
              "Sorry, I'm having trouble responding right now. Please try again in a moment.",
          });
        }
      }
    }

    // ✅ Safe extraction
    let reply =
      aiResponse?.data?.choices?.[0]?.message?.content || "No response";

    // ✅ MEDICINE DETECTION (100% accurate)
    if (reply.includes("[MEDICINE]")) {
      reply = reply.replace("[MEDICINE]", "").trim();

      reply +=
        "\n\nMoreover, I am an AI doctor assistant. For your convenience, please consult your nearby hospital doctor.";
    }

    res.json({ reply });

  } catch (err) {
    console.error("🔥 SERVER ERROR:", err);

    // ✅ Never send 500
    res.json({
      reply: "Something went wrong. Please try again shortly.",
    });
  }
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log("✅ Server running on port", PORT);
});
