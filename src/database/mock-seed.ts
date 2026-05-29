/**
 * Mock seed — populates every table with realistic development data.
 * Run: npm run seed:mock
 *
 * WARNING: clears all transactional tables before inserting.
 * Safe to run multiple times.
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

import { User }                from '../users/entities/user.entity';
import { Role }                from '../roles/entities/role.entity';
import { Permission }          from '../roles/entities/permission.entity';
import { Debtor }              from '../debtors/entities/debtor.entity';
import { DebtCase }            from '../debt-cases/entities/debt-case.entity';
import { DpdSnapshot }         from '../debt-cases/entities/dpd-snapshot.entity';
import { NotificationTemplate, NotificationChannel } from '../notifications/entities/notification-template.entity';
import { NotificationLog }     from '../notifications/entities/notification-log.entity';
import { ScheduledTask }       from '../scheduler/entities/scheduled-task.entity';
import { PtpRecord }           from '../ptp/entities/ptp-record.entity';
import { AgentActivityLog }    from '../reports/entities/agent-activity-log.entity';
import { IntegrationConfig }   from '../integrations/entities/integration-config.entity';

import mockData from './mock-data.json';

dotenv.config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host:     process.env.DB_HOST     ?? 'localhost',
  port:     Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USERNAME ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME     ?? 'debt_manager',
  entities: [
    User, Role, Permission,
    Debtor, DebtCase, DpdSnapshot,
    NotificationTemplate, NotificationLog,
    ScheduledTask, PtpRecord,
    AgentActivityLog, IntegrationConfig,
  ],
  synchronize: true,
});

// ── helpers ───────────────────────────────────────────────────────────────────

function log(msg: string) { console.log(`  ${msg}`); }

async function clearTransactionalTables() {
  // Delete in reverse dependency order to respect FK constraints
  await AppDataSource.query('DELETE FROM agent_activity_logs');
  await AppDataSource.query('DELETE FROM dpd_snapshots');
  await AppDataSource.query('DELETE FROM ptp_records');
  await AppDataSource.query('DELETE FROM scheduled_tasks');
  await AppDataSource.query('DELETE FROM notification_logs');
  await AppDataSource.query('DELETE FROM debt_cases');
  await AppDataSource.query('DELETE FROM notification_templates');
  await AppDataSource.query('DELETE FROM debtors');
  await AppDataSource.query('DELETE FROM integration_configs');
  log('🗑  Cleared transactional tables');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function mockSeed() {
  await AppDataSource.initialize();
  console.log('✅ Database connected\n');

  const permRepo      = AppDataSource.getRepository(Permission);
  const roleRepo      = AppDataSource.getRepository(Role);
  const userRepo      = AppDataSource.getRepository(User);
  const debtorRepo    = AppDataSource.getRepository(Debtor);
  const caseRepo      = AppDataSource.getRepository(DebtCase);
  const dpdRepo       = AppDataSource.getRepository(DpdSnapshot);
  const templateRepo  = AppDataSource.getRepository(NotificationTemplate);
  const logRepo       = AppDataSource.getRepository(NotificationLog);
  const taskRepo      = AppDataSource.getRepository(ScheduledTask);
  const ptpRepo       = AppDataSource.getRepository(PtpRecord);
  const activityRepo  = AppDataSource.getRepository(AgentActivityLog);
  const integRepo     = AppDataSource.getRepository(IntegrationConfig);

  await clearTransactionalTables();
  console.log();

  // ── 1. Permissions ──────────────────────────────────────────────────────────
  console.log('📋 Permissions');
  const permMap: Record<string, Permission> = {};
  for (const p of mockData.permissions) {
    let perm = await permRepo.findOne({ where: { codename: p.codename } });
    if (!perm) {
      perm = permRepo.create(p);
      await permRepo.save(perm);
      log(`➕ ${p.codename}`);
    } else {
      log(`✓  ${p.codename}`);
    }
    permMap[p.codename] = perm;
  }

  // ── 2. Roles ────────────────────────────────────────────────────────────────
  console.log('\n🎭 Roles');
  const roleMap: Record<string, Role> = {};
  for (const r of mockData.roles) {
    let role = await roleRepo.findOne({ where: { name: r.name } });
    if (!role) {
      role = roleRepo.create({ name: r.name, description: r.description });
      log(`➕ ${r.name}`);
    } else {
      log(`✓  ${r.name}`);
    }
    role.permissions = r.permissionCodes.map((c: string) => permMap[c]);
    await roleRepo.save(role);
    roleMap[r.name] = role;
  }

  // ── 3. Users ────────────────────────────────────────────────────────────────
  console.log('\n👤 Users');
  const userMap: Record<string, User> = {};
  for (const u of mockData.users) {
    let user = await userRepo.findOne({ where: { username: u.username } });
    if (!user) {
      user = userRepo.create({
        username:     u.username,
        email:        u.email,
        passwordHash: await bcrypt.hash(u.password, 10),
      });
      log(`➕ ${u.username} (${u.roleName})`);
    } else {
      log(`✓  ${u.username}`);
    }
    user.roles = [roleMap[u.roleName]];
    await userRepo.save(user);
    userMap[u.username] = user;
  }

  // ── 4. Debtors ──────────────────────────────────────────────────────────────
  console.log('\n🧑 Debtors');
  const debtorMap: Record<string, Debtor> = {};
  for (const d of mockData.debtors) {
    const debtor = debtorRepo.create({
      fullName:      d.fullName,
      phone:         d.phone,
      email:         d.email ?? undefined,
      whatsappNumber: d.whatsappNumber ?? undefined,
      telegramId:    d.telegramId ?? undefined,
    });
    await debtorRepo.save(debtor);
    debtorMap[d.phone] = debtor;
    log(`➕ ${d.fullName}  (${d.phone})`);
  }

  // ── 5. Debt Cases ───────────────────────────────────────────────────────────
  console.log('\n📁 Debt Cases');
  const cases: DebtCase[] = [];
  for (const [i, dc] of mockData.debt_cases.entries()) {
    const debtCase = caseRepo.create({
      debtor:        debtorMap[dc.debtorPhone],
      assignedAgent: userMap[dc.agentUsername],
      amount:        dc.amount,
      dueDate:       dc.dueDate,
      dpd:           dc.dpd,
      status:        dc.status as any,
    });
    await caseRepo.save(debtCase);
    cases.push(debtCase);
    log(`➕ Case ${i + 1}: ${debtorMap[dc.debtorPhone].fullName} — ${dc.amount} сом [${dc.status}]`);
  }

  // ── 6. Notification Templates ───────────────────────────────────────────────
  console.log('\n📝 Notification Templates');
  const templateMap: Record<string, NotificationTemplate> = {};
  for (const t of mockData.notification_templates) {
    const tmpl = templateRepo.create({ ...t, channel: t.channel as NotificationChannel });
    await templateRepo.save(tmpl);
    templateMap[t.name] = tmpl;
    log(`➕ [${t.channel.toUpperCase()}] ${t.name}`);
  }

  // ── 7. Notification Logs ────────────────────────────────────────────────────
  console.log('\n📨 Notification Logs');
  for (const l of mockData.notification_logs) {
    const entry = logRepo.create({
      debtCaseId:  cases[l.caseIndex - 1].id,
      template:    templateMap[l.templateName],
      channel:     l.channel,
      status:      l.status as any,
      sentAt:      l.sentAt ? new Date(l.sentAt) : undefined,
      responseRaw: l.responseRaw ?? undefined,
    });
    await logRepo.save(entry);
    log(`➕ Case ${l.caseIndex} / ${l.channel} / ${l.status}`);
  }

  // ── 8. Scheduled Tasks ──────────────────────────────────────────────────────
  console.log('\n⏰ Scheduled Tasks');
  for (const st of mockData.scheduled_tasks) {
    const task = taskRepo.create({
      debtCaseId:  cases[st.caseIndex - 1].id,
      template:    templateMap[st.templateName],
      channel:     st.channel,
      scheduledAt: new Date(st.scheduledAt),
      taskStatus:  st.taskStatus as any,
    });
    await taskRepo.save(task);
    log(`➕ Case ${st.caseIndex} / ${st.channel} / ${st.taskStatus} @ ${st.scheduledAt}`);
  }

  // ── 9. PTP Records ──────────────────────────────────────────────────────────
  console.log('\n🤝 PTP Records');
  for (const p of mockData.ptp_records) {
    const ptp = ptpRepo.create({
      debtCaseId:    cases[p.caseIndex - 1].id,
      agent:         userMap[p.agentUsername],
      promiseDate:   p.promiseDate,
      promisedAmount: p.promisedAmount,
      status:        p.status as any,
      note:          p.note ?? undefined,
    });
    await ptpRepo.save(ptp);
    log(`➕ Case ${p.caseIndex} / ${p.promisedAmount} сом / ${p.status}`);
  }

  // ── 10. DPD Snapshots ───────────────────────────────────────────────────────
  console.log('\n📊 DPD Snapshots');
  for (const ds of mockData.dpd_snapshots) {
    const snap = dpdRepo.create({
      debtCaseId:   cases[ds.caseIndex - 1].id,
      dpdValue:     ds.dpdValue,
      snapshotDate: ds.snapshotDate,
    });
    await dpdRepo.save(snap);
    log(`➕ Case ${ds.caseIndex} / dpd=${ds.dpdValue} @ ${ds.snapshotDate}`);
  }

  // ── 11. Agent Activity Logs ─────────────────────────────────────────────────
  console.log('\n🗒  Agent Activity Logs');
  for (const al of mockData.agent_activity_logs) {
    const entry = activityRepo.create({
      agent:       userMap[al.agentUsername],
      debtCaseId:  al.caseIndex != null ? cases[al.caseIndex - 1].id : undefined,
      actionType:  al.actionType,
      note:        al.note ?? undefined,
    });
    await activityRepo.save(entry);
    log(`➕ ${al.agentUsername} / ${al.actionType}${al.caseIndex ? ` / Case ${al.caseIndex}` : ''}`);
  }

  // ── 12. Integration Configs ─────────────────────────────────────────────────
  console.log('\n🔌 Integration Configs');
  for (const ic of mockData.integration_configs) {
    const config = integRepo.create({
      channel:    ic.channel,
      provider:   ic.provider,
      apiKey:     ic.apiKey,
      webhookUrl: ic.webhookUrl ?? undefined,
      isActive:   ic.isActive,
    });
    await integRepo.save(config);
    log(`➕ [${ic.channel}] ${ic.provider} — active: ${ic.isActive}`);
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log('\n────────────────────────────────────────────────────');
  console.log('🌱 Mock seed complete!');
  console.log('────────────────────────────────────────────────────');
  console.log('  Credentials:');
  console.log('    admin            / Admin1234!');
  console.log('    agent_ivanov     / Agent1234!');
  console.log('    agent_seitkali   / Agent1234!');
  console.log('    agent_bakyt      / Agent1234!');
  console.log('    supervisor_petrov / Super1234!');
  console.log('\n  Tables populated:');
  console.log(`    permissions         : ${mockData.permissions.length}`);
  console.log(`    roles               : ${mockData.roles.length}`);
  console.log(`    users               : ${mockData.users.length}`);
  console.log(`    debtors             : ${mockData.debtors.length}`);
  console.log(`    debt_cases          : ${mockData.debt_cases.length}`);
  console.log(`    notification_templates: ${mockData.notification_templates.length}`);
  console.log(`    notification_logs   : ${mockData.notification_logs.length}`);
  console.log(`    scheduled_tasks     : ${mockData.scheduled_tasks.length}`);
  console.log(`    ptp_records         : ${mockData.ptp_records.length}`);
  console.log(`    dpd_snapshots       : ${mockData.dpd_snapshots.length}`);
  console.log(`    agent_activity_logs : ${mockData.agent_activity_logs.length}`);
  console.log(`    integration_configs : ${mockData.integration_configs.length}`);
  console.log('────────────────────────────────────────────────────\n');

  await AppDataSource.destroy();
}

mockSeed().catch((err) => {
  console.error('❌ Mock seed failed:', err);
  process.exit(1);
});
