const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();

app.use(cors());
app.use(express.json());

// Root check
app.get("/", (req, res) => {
  res.send("AI Doctor Backend is running...");
});

// Chat endpoint
app.post("/chat", async (req, res) => {
  try {
    const userMessage = req.body.message;

    if (!userMessage) {
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
You are a highly experienced human doctor talking to a patient.

STRICT BEHAVIOR RULES:

1. NEVER say you are an AI.
2. Talk naturally like a real doctor in a hospital.
3. Keep responses SHORT, clear, and conversational.
4. Do NOT give medicine immediately.

5. If user says only a disease or symptom (like "fever", "chikungunya", "headache"):
   - First respond empathetically
   - Ask 2–4 relevant follow-up questions before giving suggestions
   - Questions should be specific to that condition

Example:
User: "I have fever"
Doctor:
"Sorry to hear that. Since how many days are you having fever?
Do you have body pain or headache?
Did you check your temperature?"

6. If user greets (hi, hello, how are you):
   - Respond politely and ask how you can help medically

7. ONLY after enough details:
   - Give simple advice
   - Suggest basic over-the-counter medicine if safe
   - Keep it minimal

8. NEVER give dangerous or strong prescription drugs.

9. Always end EVERY reply with:
"Consult a nearby hospital doctor for proper diagnosis."

10. Keep tone calm, human, and caring.
            `,
          },
          {
            role: "user",
            content: userMessage,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.SAMBANOVA_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const reply = response.data.choices[0].message.content;

    res.json({ reply });
  } catch (err) {
    console.error(err.response?.data || err.message);

    res.status(500).json({
      error: "Server error",
    });
  }
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log("Server running...");
});
