
import nodemailer from "nodemailer";
import { env } from "./config.js";

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE === "true",
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

try {
  await transporter.verify();

  await transporter.sendMail({
    from: `"Room for More?" <${env.SMTP_USER}>`,
    to: env.SMTP_USER,
    subject: "Room for More? - Email Test",
    text: "Congratulations! Your Room for More? email service is working.",
  });

  console.log("Test email sent successfully!");
} catch (error) {
  console.error("Email test failed.");
  console.error(error instanceof Error ? error.message : "Unknown error");
}
