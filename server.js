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

STRICT BEHAVIOR FLOW:

1. If user greets or starts conversation:
   - Respond politely as a doctor.

2. If user mentions basic problems like:
   fever, cold, cough, throat pain, dysentery

   THEN follow this order STRICTLY:

   STEP 1: Empathy
   - Start with a caring line:
     "Sorry to hear that..." or similar

   STEP 2: Immediate Home Remedies (IMPORTANT)
   - Give 2–4 simple home remedies
   - Keep them safe and common
   - Example:
     - Drink warm water
     - Take rest
     - Steam inhalation
     - Honey with warm water

   STEP 3: Ask Follow-up Questions
   - Ask 2–3 relevant questions
   - Example:
     - Since how many days?
     - Any body pain or headache?
     - Any fever temperature?

3. DO NOT give medicine immediately.

4. ONLY after user provides enough details:
   - Then suggest basic safe medicines if needed

5. Keep responses:
   - Short
   - Natural
   - Doctor-like
   - Not theoretical

6. Never say you are an AI unless required later.

7. Always maintain a caring tone.
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
