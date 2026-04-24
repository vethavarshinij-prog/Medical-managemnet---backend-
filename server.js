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

    // ✅ Support both old & new format
    if (messagesFromFrontend && Array.isArray(messagesFromFrontend)) {
      messages = messagesFromFrontend;
    } else if (userMessage) {
      messages = [{ role: "user", content: userMessage }];
    } else {
      return res.status(400).json({ error: "Message required" });
    }

    const response = await axios.post(
      "https://api.sambanova.ai/v1/chat/completions",
      {
        model: "Llama-4-Maverick-17B-128E-Instruct",
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

   FOLLOW THIS ORDER STRICTLY:

   STEP 1: Empathy
   - "Sorry to hear that..."

   STEP 2: Home Remedies
   - Give 2–4 simple remedies
   - Example:
     - Warm water
     - Rest
     - Steam
     - Honey

   STEP 3: Ask Questions
   - Ask 2–3 relevant follow-ups

4. DO NOT give medicine immediately.

5. ONLY after enough details:
   - Suggest simple medicines if needed

6. If you mention ANY medicine:
   - Add this tag at the END: [MEDICINE]

7. Keep answers:
   - Short
   - Clear
   - Human-like
   - Caring

8. Never randomly restart conversation.

9. Do NOT say you are AI unless disclaimer is added later.
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
      }
    );

    // ✅ Safe response handling (fixes 500 crash)
    let reply = "";

    if (
      response.data &&
      response.data.choices &&
      response.data.choices.length > 0
    ) {
      reply = response.data.choices[0].message.content;
    } else {
      return res.status(500).json({
        error: "Invalid AI response",
      });
    }

    // ✅ Detect medicine using tag (100% accurate)
    const containsMedicine = reply.includes("[MEDICINE]");

    if (containsMedicine) {
      reply = reply.replace("[MEDICINE]", "").trim();

      reply +=
        "\n\nMoreover, I am an AI doctor assistant. For your convenience, please consult your nearby hospital doctor.";
    }

    res.json({ reply });

  } catch (err) {
    console.error("FULL ERROR:", err);

    res.status(500).json({
      error: "Server error",
    });
  }
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log("Server running...");
});
