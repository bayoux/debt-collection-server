/**
 * Seed script — creates default roles, permissions and users.
 * Run: npm run seed
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import { User } from '../users/entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { Permission } from '../roles/entities/permission.entity';

dotenv.config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USERNAME ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME ?? 'debt_collection',
  entities: [User, Role, Permission],
  synchronize: true,
});

// ── Seed data ─────────────────────────────────────────────────────────────────

const PERMISSIONS = [
  { codename: 'can_view_debtors',         description: 'View debtor list' },
  { codename: 'can_manage_debtors',       description: 'Create/edit/delete debtors' },
  { codename: 'can_send_notification',    description: 'Manually send notifications' },
  { codename: 'can_view_reports',         description: 'View analytics and reports' },
  { codename: 'can_manage_integrations',  description: 'Manage channel integrations' },
  { codename: 'can_manage_users',         description: 'Create and manage users' },
  { codename: 'can_record_ptp',           description: 'Record promise-to-pay' },
  { codename: 'can_manage_templates',     description: 'Create/edit notification templates' },
];

const ROLES = [
  {
    name: 'admin',
    description: 'Full system access',
    permissionCodes: PERMISSIONS.map((p) => p.codename),
  },
  {
    name: 'agent',
    description: 'Front-line collection agent',
    permissionCodes: [
      'can_view_debtors',
      'can_send_notification',
      'can_record_ptp',
    ],
  },
  {
    name: 'supervisor',
    description: 'Team lead — read analytics',
    permissionCodes: [
      'can_view_debtors',
      'can_view_reports',
      'can_record_ptp',
    ],
  },
];

const USERS = [
  {
    username: 'admin',
    email: 'admin@debtcollection.local',
    password: 'Admin1234!',
    roleName: 'admin',
  },
  {
    username: 'agent_ivanov',
    email: 'ivanov@debtcollection.local',
    password: 'Agent1234!',
    roleName: 'agent',
  },
  {
    username: 'supervisor_petrov',
    email: 'petrov@debtcollection.local',
    password: 'Super1234!',
    roleName: 'supervisor',
  },
];

// ── Main ──────────────────────────────────────────────────────────────────────

async function seed() {
  await AppDataSource.initialize();
  console.log('✅ Database connected');

  const permRepo = AppDataSource.getRepository(Permission);
  const roleRepo = AppDataSource.getRepository(Role);
  const userRepo = AppDataSource.getRepository(User);

  // 1. Permissions
  const permMap: Record<string, Permission> = {};
  for (const p of PERMISSIONS) {
    let perm = await permRepo.findOne({ where: { codename: p.codename } });
    if (!perm) {
      perm = permRepo.create(p);
      await permRepo.save(perm);
      console.log(`  ➕ Permission: ${p.codename}`);
    }
    permMap[p.codename] = perm;
  }

  // 2. Roles
  const roleMap: Record<string, Role> = {};
  for (const r of ROLES) {
    let role = await roleRepo.findOne({ where: { name: r.name } });
    if (!role) {
      role = roleRepo.create({ name: r.name, description: r.description });
      console.log(`  ➕ Role: ${r.name}`);
    }
    role.permissions = r.permissionCodes.map((c) => permMap[c]);
    await roleRepo.save(role);
    roleMap[r.name] = role;
  }

  // 3. Users
  for (const u of USERS) {
    let user = await userRepo.findOne({ where: { username: u.username } });
    if (!user) {
      user = userRepo.create({
        username: u.username,
        email: u.email,
        passwordHash: await bcrypt.hash(u.password, 10),
      });
      console.log(`  ➕ User: ${u.username}  (password: ${u.password})`);
    }
    user.roles = [roleMap[u.roleName]];
    await userRepo.save(user);
  }

  console.log('\n🌱 Seed complete!');
  console.log('────────────────────────────────────────');
  console.log('  admin            / Admin1234!');
  console.log('  agent_ivanov     / Agent1234!');
  console.log('  supervisor_petrov / Super1234!');
  console.log('  Swagger: http://localhost:3000/api/docs');
  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
