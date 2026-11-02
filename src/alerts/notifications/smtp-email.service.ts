import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';

export type AlertEmail = {
  to: string;
  subject: string;
  text: string;
};

@Injectable()
export class SmtpEmailService {
  private readonly transporter?: Transporter;
  private readonly from?: string;

  constructor(config: ConfigService) {
    const host = config.get<string>('email.host');
    this.from = config.get<string>('email.from');
    if (!host || !this.from) return;

    const user = config.get<string>('email.user');
    const pass = config.get<string>('email.password');
    this.transporter = nodemailer.createTransport({
      host,
      port: config.get<number>('email.port') ?? 587,
      secure: config.get<boolean>('email.secure') ?? false,
      ...(user && pass ? { auth: { user, pass } } : {}),
    });
  }

  isConfigured(): boolean {
    return Boolean(this.transporter && this.from);
  }

  async send(email: AlertEmail): Promise<void> {
    if (!this.transporter || !this.from) {
      throw new Error('SMTP is not configured');
    }
    await this.transporter.sendMail({ from: this.from, ...email });
  }
}
