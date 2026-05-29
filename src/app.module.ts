import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { NormalizeBodyMiddleware } from './common/middleware/normalize-body.middleware';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { DebtorsModule } from './debtors/debtors.module';
import { DebtCasesModule } from './debt-cases/debt-cases.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { PtpModule } from './ptp/ptp.module';
import { ReportsModule } from './reports/reports.module';
import { IntegrationsModule } from './integrations/integrations.module';

@Module({
  imports: [
    // ── Config ──────────────────────────────────────────────
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),

    // ── Database ─────────────────────────────────────────────
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        host: cfg.get('DB_HOST', 'localhost'),
        port: cfg.get<number>('DB_PORT', 5432),
        username: cfg.get('DB_USERNAME', 'postgres'),
        password: cfg.get('DB_PASSWORD', 'postgres'),
        database: cfg.get('DB_NAME', 'debt_collection'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true,   // diploma mode — auto-creates tables
        logging: cfg.get('NODE_ENV') === 'development',
      }),
    }),

    // ── Feature modules ──────────────────────────────────────
    AuthModule,
    UsersModule,
    RolesModule,
    DebtorsModule,
    DebtCasesModule,
    NotificationsModule,
    SchedulerModule,
    PtpModule,
    ReportsModule,
    IntegrationsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(NormalizeBodyMiddleware).forRoutes('*');
  }
}
