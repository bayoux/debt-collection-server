import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { IntegrationConfig } from './entities/integration-config.entity';
import { CreateIntegrationConfigDto } from './dto/integration.dto';

@Injectable()
export class IntegrationsService {
  constructor(
    @InjectRepository(IntegrationConfig)
    private readonly repo: Repository<IntegrationConfig>,
    private readonly config: ConfigService,
  ) {}

  async create(dto: CreateIntegrationConfigDto): Promise<IntegrationConfig> {
    const config = this.repo.create({
      channel: dto.channel,
      provider: dto.provider,
      apiKey: dto.apiKey,
      webhookUrl: dto.webhookUrl,
      isActive: dto.isActive ?? true,
    });
    return this.repo.save(config);
  }

  async findAll(): Promise<IntegrationConfig[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<IntegrationConfig> {
    const config = await this.repo.findOne({ where: { id } });
    if (!config) throw new NotFoundException(`IntegrationConfig ${id} not found`);
    return config;
  }

  async update(id: string, dto: CreateIntegrationConfigDto): Promise<IntegrationConfig> {
    const config = await this.findOne(id);
    Object.assign(config, dto);
    return this.repo.save(config);
  }

  async remove(id: string): Promise<void> {
    const config = await this.findOne(id);
    await this.repo.remove(config);
  }

  async testConnection(id: string): Promise<{ success: boolean; message: string }> {
    const config = await this.repo.findOne({
      where: { id },
      select: ['id', 'channel', 'provider', 'apiKey', 'webhookUrl', 'isActive'],
    });
    if (!config) throw new NotFoundException(`IntegrationConfig ${id} not found`);

    switch (config.channel) {
      case 'email':
        return this.testEmail();
      case 'telegram':
        return this.testTelegram();
      case 'chat2desk':
      case 'whatsapp':
        return this.testChat2Desk();
      default:
        return this.testWebhook(config);
    }
  }

  private async testEmail(): Promise<{ success: boolean; message: string }> {
    const transport = nodemailer.createTransport({
      host: this.config.get('SMTP_HOST', 'smtp.gmail.com'),
      port: parseInt(this.config.get('SMTP_PORT', '587'), 10),
      secure: this.config.get('SMTP_SECURE', 'false') === 'true',
      auth: {
        user: this.config.get('SMTP_USER'),
        pass: this.config.get('SMTP_PASS'),
      },
    });

    try {
      await transport.verify();
      return { success: true, message: `SMTP connection OK (${this.config.get('SMTP_HOST')})` };
    } catch (err) {
      return { success: false, message: `SMTP error: ${(err as Error).message}` };
    } finally {
      transport.close();
    }
  }

  private async testTelegram(): Promise<{ success: boolean; message: string }> {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN', '');
    if (!token) {
      return { success: false, message: 'TELEGRAM_BOT_TOKEN is not configured' };
    }
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const body = (await res.json()) as any;
      if (body?.ok) {
        return { success: true, message: `Telegram bot OK (@${body.result?.username})` };
      }
      return { success: false, message: `Telegram error: ${body?.description ?? 'unknown'}` };
    } catch (err) {
      return { success: false, message: `Telegram error: ${(err as Error).message}` };
    }
  }

  private async testChat2Desk(): Promise<{ success: boolean; message: string }> {
    const token = this.config.get<string>('CHAT2DESK_API_TOKEN', '');
    if (!token) {
      return { success: false, message: 'CHAT2DESK_API_TOKEN is not configured' };
    }
    try {
      const res = await fetch('https://api.chat2desk.com/v1/channels', {
        headers: { Authorization: token },
      });
      if (res.ok) {
        const body = (await res.json()) as any;
        const channelId = this.config.get<string>('CHAT2DESK_CHANNEL_ID', '');
        const channel = (body?.data ?? []).find((c: any) => String(c.id) === channelId);
        return {
          success: true,
          message: channel
            ? `Chat2Desk OK — channel ${channelId} (${channel.name ?? channel.phone})`
            : `Chat2Desk OK — ${body?.data?.length ?? 0} channel(s) available`,
        };
      }
      return { success: false, message: `Chat2Desk HTTP ${res.status}` };
    } catch (err) {
      return { success: false, message: `Chat2Desk error: ${(err as Error).message}` };
    }
  }

  private async testWebhook(
    config: IntegrationConfig,
  ): Promise<{ success: boolean; message: string }> {
    if (!config.webhookUrl) {
      return { success: false, message: `No webhook URL configured for ${config.provider}` };
    }
    try {
      const res = await fetch(config.webhookUrl, {
        method: 'HEAD',
        headers: config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {},
        signal: AbortSignal.timeout(5000),
      });
      return res.ok || res.status < 500
        ? { success: true, message: `Webhook reachable — HTTP ${res.status}` }
        : { success: false, message: `Webhook returned HTTP ${res.status}` };
    } catch (err) {
      return { success: false, message: `Webhook unreachable: ${(err as Error).message}` };
    }
  }
}
