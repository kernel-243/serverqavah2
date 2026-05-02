import { NextRequest, NextResponse } from "next/server"
import nodemailer from "nodemailer"

export async function POST(req: NextRequest) {
  try {
    const { to, subject, html, pdfBase64, pdfFilename } = await req.json()

    if (!to || !subject) {
      return NextResponse.json({ error: "Destinataire et sujet requis." }, { status: 400 })
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })

    const attachments = pdfBase64
      ? [{ filename: pdfFilename || "recu.pdf", content: pdfBase64, encoding: "base64" as const }]
      : []

    await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || "Qavahland"}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      attachments,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erreur envoi email:", error)
    return NextResponse.json({ error: "Échec de l'envoi de l'email." }, { status: 500 })
  }
}
