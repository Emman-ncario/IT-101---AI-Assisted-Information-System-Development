
import nodemailer from "nodemailer";
import { env } from "../config.js";

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE === "true",
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

export async function sendRepresentativeOtp(
  email: string,
  otp: string,
) {
  await transporter.sendMail({
    from: `"Room for More?" <${env.SMTP_USER}>`,
    to: email,
    subject: "Your Representative Registration Verification Code",
    text: `Your verification code is ${otp}. It expires in 5 minutes. Do not share this code with anyone.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto;">
        <h2>Room for More?</h2>
        <p>Hello!</p>
        <p>Use the following verification code to complete your representative registration:</p>
        <h1 style="letter-spacing: 8px;">${otp}</h1>
        <p>This code expires in <strong>5 minutes</strong>.</p>
        <p>Please do not share this code with anyone.</p>
      </div>
    `,
  });
}
