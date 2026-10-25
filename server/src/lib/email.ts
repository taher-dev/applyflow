import nodemailer from 'nodemailer'
import { env } from '../config/env.js'

export interface SendPasswordResetEmailOptions {
  to: string
  name: string
  resetUrl: string
  resetToken: string
}

export interface EmailSendResult {
  success: boolean
  provider: 'resend' | 'smtp' | 'console'
  error?: string
}

/**
 * Generates responsive, modern HTML content for password reset email.
 */
function getPasswordResetHtml(name: string, resetUrl: string): string {
  const safeName = name?.trim() ? name.trim() : 'there'

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your ApplyFlow Password</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #0f172a;
      background-color: #f8fafc;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 560px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .header {
      background: #0f172a;
      padding: 28px 32px;
      text-align: center;
    }
    .brand {
      color: #ffffff;
      font-size: 22px;
      font-weight: 700;
      letter-spacing: -0.5px;
      text-decoration: none;
    }
    .content {
      padding: 36px 32px;
    }
    h1 {
      font-size: 20px;
      font-weight: 600;
      color: #0f172a;
      margin-top: 0;
      margin-bottom: 16px;
    }
    p {
      color: #475569;
      font-size: 15px;
      margin-bottom: 24px;
    }
    .btn-container {
      text-align: center;
      margin: 32px 0;
    }
    .btn {
      display: inline-block;
      background-color: #0f172a;
      color: #ffffff !important;
      font-weight: 600;
      font-size: 14px;
      text-decoration: none;
      padding: 13px 32px;
      border-radius: 8px;
      letter-spacing: 0.2px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .btn:hover {
      background-color: #1e293b;
    }
    .footnote {
      font-size: 12px;
      color: #94a3b8;
      border-top: 1px solid #f1f5f9;
      padding-top: 24px;
      margin-top: 32px;
      word-break: break-all;
    }
    .footer {
      background-color: #f8fafc;
      padding: 20px 32px;
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
      border-top: 1px solid #f1f5f9;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand">ApplyFlow</div>
    </div>
    <div class="content">
      <h1>Reset your password</h1>
      <p>Hello ${safeName},</p>
      <p>We received a request to reset the password for your ApplyFlow account. Click the button below to confirm your request and choose a new password:</p>
      
      <div class="btn-container">
        <a href="${resetUrl}" class="btn" target="_blank" rel="noopener noreferrer">Reset Password</a>
      </div>

      <p>This password reset link will expire in <strong>1 hour</strong>. If you did not request this change, you can safely ignore this email—your account remains completely secure.</p>

      <div class="footnote">
        If you are having trouble with the button, copy and paste this link into your web browser:<br>
        <a href="${resetUrl}" style="color: #2563eb; text-decoration: underline;">${resetUrl}</a>
      </div>
    </div>
    <div class="footer">
      ApplyFlow — Job Application & Interview Pipeline Tracker
    </div>
  </div>
</body>
</html>
`
}

/**
 * Generates plain-text fallback for email clients that do not render HTML.
 */
function getPasswordResetText(name: string, resetUrl: string): string {
  const safeName = name?.trim() ? name.trim() : 'there'
  return `Hello ${safeName},

We received a request to reset the password for your ApplyFlow account.

Please confirm your request and choose a new password by visiting the following link:
${resetUrl}

This link is valid for 1 hour. If you did not request a password reset, you can safely ignore this email.

— The ApplyFlow Team`
}

/**
 * Sends password reset email using configured provider (Resend, SMTP, or console logger).
 */
export async function sendPasswordResetEmail(
  options: SendPasswordResetEmailOptions
): Promise<EmailSendResult> {
  const { to, name, resetUrl } = options
  const subject = 'Reset your ApplyFlow password'
  const html = getPasswordResetHtml(name, resetUrl)
  const text = getPasswordResetText(name, resetUrl)
  const from = env.EMAIL_FROM || 'ApplyFlow <no-reply@applyflow.app>'

  // 1. Try Resend HTTP API if RESEND_API_KEY is configured
  if (env.RESEND_API_KEY && env.RESEND_API_KEY.trim()) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.RESEND_API_KEY.trim()}`,
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject,
          html,
          text,
        }),
      })

      if (response.ok) {
        console.log(`[Email Service] Password reset email sent via Resend to ${to}`)
        return { success: true, provider: 'resend' }
      }

      const errorText = await response.text()
      console.error(`[Email Service] Resend API error (${response.status}):`, errorText)
    } catch (err) {
      console.error('[Email Service] Failed to send email via Resend API:', err)
    }
  }

  // 2. Try SMTP via Nodemailer if SMTP_HOST is configured
  if (env.SMTP_HOST && env.SMTP_HOST.trim()) {
    try {
      const transporter = nodemailer.createTransport({
        host: env.SMTP_HOST.trim(),
        port: env.SMTP_PORT || 587,
        secure: env.SMTP_SECURE || false,
        auth:
          env.SMTP_USER && env.SMTP_PASS
            ? {
                user: env.SMTP_USER.trim(),
                pass: env.SMTP_PASS.trim(),
              }
            : undefined,
      })

      await transporter.sendMail({
        from,
        to,
        subject,
        html,
        text,
      })

      console.log(`[Email Service] Password reset email sent via SMTP to ${to}`)
      return { success: true, provider: 'smtp' }
    } catch (err) {
      console.error('[Email Service] Failed to send email via SMTP:', err)
    }
  }

  // 3. Fallback: Log to console in development/demo mode
  console.log('\n============================================================')
  console.log('📧 [EMAIL DISPATCH - CONSOLE SIMULATION]')
  console.log(`To: ${to}`)
  console.log(`Subject: ${subject}`)
  console.log(`Reset URL: ${resetUrl}`)
  console.log('============================================================\n')

  return { success: true, provider: 'console' }
}
