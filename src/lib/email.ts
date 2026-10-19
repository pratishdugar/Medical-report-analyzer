import { env, isProduction } from "./env";

/**
 * Transactional email (password reset). Uses SMTP_URL when configured
 * (any provider, e.g. Amazon SES Mumbai, Zoho, SendGrid). In development
 * without SMTP the message is printed to the server console instead.
 */
export async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  const { SMTP_URL, EMAIL_FROM } = env();
  if (!SMTP_URL) {
    if (isProduction()) {
      console.warn("[email] SMTP_URL is not configured; email not sent.");
    } else {
      console.info(`[email:dev] To: ${to}\nSubject: ${subject}\n\n${text}\n`);
    }
    return;
  }
  const nodemailer = await import("nodemailer");
  const transport = nodemailer.createTransport(SMTP_URL);
  await transport.sendMail({ from: EMAIL_FROM, to, subject, text });
}
