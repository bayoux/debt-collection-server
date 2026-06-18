import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface NikitaSendResult {
  messageId?: string;
  status: 'sent' | 'failed';
  error?: string;
}

@Injectable()
export class NikitaService {
  private readonly logger = new Logger(NikitaService.name);
  private readonly apiBase = 'https://smspro.nikita.kg/api';
  private readonly login: string;
  private readonly password: string;
  private readonly sender: string;

  constructor(private readonly config: ConfigService) {
    this.login = this.config.get<string>('NIKITA_LOGIN', '');
    this.password = this.config.get<string>('NIKITA_PASSWORD', '');
    this.sender = this.config.get<string>('NIKITA_SENDER', 'SMS');
  }

  async sendMessage(phone: string, text: string): Promise<NikitaSendResult> {
    if (!this.login || !this.password) {
      return { status: 'failed', error: 'NIKITA_LOGIN or NIKITA_PASSWORD is not configured' };
    }

    const normalizedPhone = phone.replace(/\D/g, '');
    const msgId = (Date.now() % 1_000_000_000_000).toString();

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<message>
  <login>${this.escapeXml(this.login)}</login>
  <pwd>${this.escapeXml(this.password)}</pwd>
  <id>${msgId}</id>
  <sender>${this.sender}</sender>
  <text>${this.escapeXml(text)}</text>
  <phones>
    <phone>${normalizedPhone}</phone>
  </phones>
</message>`;

    this.logger.debug(`sendMessage → login="${this.login}" sender="${this.sender}" phone="${normalizedPhone}"`);

    try {
      const res = await fetch(`${this.apiBase}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/xml; charset=utf-8' },
        body: xml,
      });

      const body = await res.text();
      this.logger.debug(`sendMessage response [HTTP ${res.status}]: ${body}`);

      if (!res.ok) {
        this.logger.error(`sendMessage failed: HTTP ${res.status} ${body}`);
        return { status: 'failed', error: `HTTP ${res.status}: ${body}` };
      }

      // Response: <response><status>0</status><id>...</id>...</response>
      // status 0 = success
      const statusMatch = body.match(/<status>(\d+)<\/status>/);
      const statusCode = statusMatch ? parseInt(statusMatch[1], 10) : -1;

      if (statusCode === 0) {
        return { messageId: msgId, status: 'sent' };
      }

      const errorDesc = this.describeStatusCode(statusCode);
      this.logger.error(`sendMessage error: status ${statusCode} — ${errorDesc} | sender="${this.sender}" | response: ${body}`);
      return { status: 'failed', error: `Nikita error ${statusCode}: ${errorDesc}` };
    } catch (err) {
      this.logger.error(`sendMessage exception: ${(err as Error).message}`);
      return { status: 'failed', error: (err as Error).message };
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.login || !this.password) {
      return { success: false, message: 'NIKITA_LOGIN or NIKITA_PASSWORD is not configured' };
    }

    try {
      const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><info xmlns="http://Giper.mobi/schema/Info"><login>${this.escapeXml(this.login)}</login><pwd>${this.escapeXml(this.password)}</pwd></info>`;
      const res = await fetch(`${this.apiBase}/info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/xml; charset=utf-8' },
        body: xml,
        signal: AbortSignal.timeout(5000),
      });
      const body = await res.text();

      if (!res.ok) {
        return { success: false, message: `Nikita HTTP ${res.status}` };
      }

      // Response: <response><status>0</status><state>0</state><account>100.00</account><smsprice>0.50</smsprice></response>
      // status: 0=OK, 1=format error, 2=bad auth, 3=IP not allowed
      const statusMatch = body.match(/<status>(\d+)<\/status>/);
      const statusCode = statusMatch ? parseInt(statusMatch[1], 10) : -1;

      if (statusCode === 2) return { success: false, message: 'Nikita: invalid login or password' };
      if (statusCode === 3) return { success: false, message: 'Nikita: IP address not allowed' };

      const stateMatch = body.match(/<state>(\d+)<\/state>/);
      const stateCode = stateMatch ? parseInt(stateMatch[1], 10) : -1;
      const balanceMatch = body.match(/<account>([\d.]+)<\/account>/);
      const priceMatch = body.match(/<smsprice>([\d.]+)<\/smsprice>/);
      const balance = balanceMatch ? balanceMatch[1] : '0';
      const price = priceMatch ? priceMatch[1] : '?';

      if (stateCode === 1) {
        return { success: true, message: `Nikita SMSPro connected (TEST MODE) — mass sending disabled, only to profile number. Balance: ${balance} KGS` };
      }

      if (statusCode !== 0) return { success: false, message: `Nikita error ${statusCode}` };

      return { success: true, message: `Nikita SMSPro OK — balance: ${balance} KGS, SMS price: ${price} KGS (sender: ${this.sender})` };
    } catch (err) {
      return { success: false, message: `Nikita error: ${(err as Error).message}` };
    }
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private describeStatusCode(code: number): string {
    const codes: Record<number, string> = {
      0: 'Success',
      1: 'Request format error',
      2: 'Invalid login or password',
      3: 'IP address not allowed',
      4: 'Insufficient balance',
      5: 'Sender name not allowed (not validated by admin)',
      6: 'Message blocked by stop-words',
      7: 'Invalid phone number format',
      8: 'Invalid send time format',
      9: 'Request processing timeout — retry with same id in 5-10s',
      10: 'Duplicate id (resend blocked)',
      11: 'Test mode — message not sent',
    };
    return codes[code] ?? `Unknown status code ${code}`;
  }
}
