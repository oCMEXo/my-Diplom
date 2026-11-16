import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../env.js";

export interface Mail {
  to: string;
  subject: string;
  text: string;
}

export const testOutbox: Mail[] = [];

let transport: Transporter | null | undefined;

function getTransport() {
  if (transport === undefined) transport = env.SMTP_URL ? nodemailer.createTransport(env.SMTP_URL) : null;
  return transport;
}

export function mailConfigured() {
  return Boolean(env.SMTP_URL) || env.NODE_ENV !== "production";
}

export async function sendMail(mail: Mail) {
  if (env.NODE_ENV === "test") {
    testOutbox.push(mail);
    return;
  }
  const smtp = getTransport();
  if (!smtp) {
    if (env.NODE_ENV === "development") console.info(`[mail] SMTP_URL is not set. To ${mail.to}: ${mail.subject}\n${mail.text}`);
    else console.warn(`[mail] SMTP_URL is not set; an email to ${mail.to.replace(/^.*@/, "*@")} was not sent`);
    return;
  }
  try {
    await smtp.sendMail({ from: env.MAIL_FROM, ...mail });
  } catch (error) {
    console.error("[mail] sending failed:", (error as Error).message);
  }
}
