import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        transport: {
          host: cfg.get('SMTP_HOST', 'smtp.gmail.com'),
          port: parseInt(cfg.get('SMTP_PORT', '587'), 10),
          secure: cfg.get('SMTP_SECURE', 'false') === 'true',
          auth: {
            user: cfg.get('SMTP_USER'),
            pass: cfg.get('SMTP_PASS'),
          },
        },
        defaults: {
          from: cfg.get('SMTP_FROM', `"Debt Collection" <${cfg.get('SMTP_USER')}>`),
        },
      }),
    }),
  ],
  exports: [MailerModule],
})
export class EmailModule {}
