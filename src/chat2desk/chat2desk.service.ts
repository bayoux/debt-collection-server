import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface Chat2DeskSendResult {
  messageId?: number;
  status: 'sent' | 'failed';
  error?: string;
}

@Injectable()
export class Chat2DeskService {
  private readonly logger = new Logger(Chat2DeskService.name);
  private readonly apiBase = 'https://api.chat2desk.com/v1';
  private readonly token: string;
  private readonly channelId: number;

  constructor(private readonly config: ConfigService) {
    this.token = this.config.get<string>('CHAT2DESK_API_TOKEN', '');
    this.channelId = Number(this.config.get<string>('CHAT2DESK_CHANNEL_ID', '0'));
  }

  async sendMessage(phone: string, text: string): Promise<Chat2DeskSendResult> {
    try {
      const clientId = await this.resolveClientId(phone);
      if (!clientId) {
        return { status: 'failed', error: `Could not resolve Chat2Desk client for phone ${phone}` };
      }

      const res = await fetch(`${this.apiBase}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: this.token,
        },
        body: JSON.stringify({ client_id: clientId, channel_id: this.channelId, text }),
      });

      if (res.ok) {
        const data = (await res.json()) as any;
        return { messageId: data?.data?.id, status: 'sent' };
      }

      const errorText = await res.text().catch(() => '');
      this.logger.error(`sendMessage failed: HTTP ${res.status} ${errorText}`);
      return { status: 'failed', error: `HTTP ${res.status}: ${errorText}` };
    } catch (err) {
      this.logger.error(`sendMessage exception: ${(err as Error).message}`);
      return { status: 'failed', error: (err as Error).message };
    }
  }

  // Resolves Chat2Desk client_id by phone — searches existing, creates if not found
  private async resolveClientId(phone: string): Promise<number | null> {
    // Chat2Desk requires digits only (no +), 10–14 symbols
    const normalizedPhone = phone.replace(/\D/g, '');

    // Search existing client by phone
    const searchRes = await fetch(
      `${this.apiBase}/clients?phone=${encodeURIComponent(normalizedPhone)}`,
      { headers: { Authorization: this.token } },
    );

    if (searchRes.ok) {
      const body = (await searchRes.json()) as any;
      const clients: any[] = body?.data ?? [];
      if (clients.length > 0) {
        return clients[0].id as number;
      }
    }

    // Create new client with whatsapp transport and our channel
    const createRes = await fetch(`${this.apiBase}/clients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.token,
      },
      body: JSON.stringify({
        phone: normalizedPhone,
        transport: 'whatsapp',
        channel_id: this.channelId,
      }),
    });

    if (createRes.ok) {
      const body = (await createRes.json()) as any;
      return body?.data?.id ?? null;
    }

    const err = await createRes.text().catch(() => '');
    this.logger.error(`resolveClientId create failed: HTTP ${createRes.status} ${err}`);
    return null;
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.token) {
      return { success: false, message: 'CHAT2DESK_API_TOKEN is not configured' };
    }
    try {
      const res = await fetch(`${this.apiBase}/channels`, {
        headers: { Authorization: this.token },
      });
      if (res.ok) {
        const body = (await res.json()) as any;
        const channel = (body?.data ?? []).find((c: any) => c.id === this.channelId);
        return {
          success: true,
          message: channel
            ? `Chat2Desk OK — channel ${this.channelId} (${channel.name})`
            : `Chat2Desk OK — channel ${this.channelId} connected`,
        };
      }
      return { success: false, message: `HTTP ${res.status}` };
    } catch (err) {
      return { success: false, message: (err as Error).message };
    }
  }
}
