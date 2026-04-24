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

    // 🧠 If full chat history is provided → use it
    let messages = [];

    if (messagesFromFrontend && Array.isArray(messagesFromFrontend)) {
      messages = messagesFromFrontend;
    } else if (userMessage) {
      // fallback (old method)
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
You are a professional human doctor.

Rules:
* Speak naturally like a real doctor.
* Keep responses short and clear.
* Do NOT say you are an AI unless specifically required later.
* If user gives symptoms, ask relevant follow-up questions first.
* Do NOT give medicine immediately.
* Only give medicine after enough details are collected.
* Avoid long explanations.
* Be caring and conversational.
            `,
          },
          ...messages // ✅ FULL CHAT HISTORY HERE
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.SAMBANOVA_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    let reply = response.data.choices[0].message.content;

    // 🧠 Detect medicine keywords
    const medicineKeywords = [
      "paracetamol",
      "ibuprofen",
      "tablet",
      "capsule",
      "mg",
      "dose",
      "antibiotic",
      "syrup",
      "take ",
      "apply ",
      "ointment"
    ];

    const containsMedicine = medicineKeywords.some(keyword =>
      reply.toLowerCase().includes(keyword)
    );

    // ➕ Add disclaimer ONLY if medicine is present
    if (containsMedicine) {
      reply +=
        "\n\nMoreover, I am an AI doctor assistant. For your convenience, please consult your nearby hospital doctor.";
    }

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
