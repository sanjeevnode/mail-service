// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MailtrapClient } from "mailtrap";

// Load environment variables
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const client = new MailtrapClient({ token: process.env.MAILTRAP_TOKEN });

// Auth middleware
async function authenticateBearerToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: "Missing or invalid Authorization header" });
  }

  const token = authHeader.split(" ")[1];

  var result = await verifyToken(token);
  if (!result) {
    return res.status(403).json({ error: "Invalid token" });
  }

  next();
}

async function verifyToken(token) {
  const captchaSecret = process.env.CAPTCHA_SECRET;
  const response = await fetch(
    `https://www.google.com/recaptcha/api/siteverify?secret=${captchaSecret}&response=${token}`,
    {
      method: "POST",
    }
  );
  const data = await response.json();
  return data.success;
}

app.get("/", (req, res) => {
  res.json({ message: "Welcome to the Mail Service API!" });
});

app.post("/api/send-email", authenticateBearerToken, async (req, res) => {
  const { to, cc, bcc, message, subject } = req.body;

  try {
    const sender = {
      name: "Sanjeev Kumar Singh",
      email: process.env.SENDER_EMAIL,
    };

    const recipients = Array.isArray(to)
      ? to.map((email) => ({ email }))
      : [{ email: to }];
    const ccList = cc
      ? Array.isArray(cc)
        ? cc.map((email) => ({ email }))
        : [{ email: cc }]
      : [];
    const bccList = bcc
      ? Array.isArray(bcc)
        ? bcc.map((email) => ({ email }))
        : [{ email: bcc }]
      : [];

    const mailOptions = {
      from: sender,
      to: recipients,
      subject: subject || "No Subject",
      text: message,
      cc: ccList.length ? ccList : undefined,
      bcc: bccList.length ? bccList : undefined,
    };

    const response = await client.send(mailOptions);

    res.status(200).json({ success: true, response });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/contact", authenticateBearerToken, async (req, res) => {
  const { name, email, phone, message } = req.body;

  if (!name || !email || !phone || !message) {
    return res.status(400).json({ error: "All fields are required." });
  }

  try {
    const sender = {
      name: "Contact Form",
      email: process.env.SENDER_EMAIL,
    };

    const htmlMessage = `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Message:</strong><br>${message.replace(/\n/g, "<br>")}</p>
      `;

    const response = await client.send({
      from: sender,
      to: [{ email: process.env.RECIVER_EMAIL }],
      subject: "New Contact Form Submission",
      text: `${name} (${email}, ${phone}): ${message}`,
      html: htmlMessage,
    });

    res.status(200).json({ success: true, response });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`✅ Server running on http://localhost:${PORT}`)
);
