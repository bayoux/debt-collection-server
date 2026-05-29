# Debt Collection — Auth Service

Автоматизированная система управления дебиторской задолженностью.  
Первый модуль: **Auth + Users + Roles + Permissions**.

---

## Стек

| Слой | Технология |
|---|---|
| Framework | NestJS 10 |
| ORM | TypeORM 0.3 |
| База данных | PostgreSQL 16 |
| Аутентификация | Passport JWT (access + refresh) |
| Документация | Swagger / OpenAPI 3 |
| Очереди (следующий этап) | Bull + Redis |

---

## Быстрый старт (Docker)

```bash
# 1. Скопировать переменные окружения
cp .env.example .env

# 2. Поднять PostgreSQL + приложение
docker compose up --build -d

# 3. Заполнить тестовыми данными
docker compose exec app npm run seed
```

Swagger UI: **http://localhost:3000/api/docs**

---

## Docker dev

```bash
# запустить
docker-compose -f docker-compose.dev.yml up --build

# остановить
docker-compose -f docker-compose.dev.yml down

# логи в реальном времени
docker logs -f debt_collection_dev
```
---

## Локальная разработка

```bash
# Зависимости
npm install

# Только база в Docker
docker compose up postgres -d

# Запустить приложение
cp .env.example .env
npm run start:dev

# Seed
npm run seed
```

---

## Тестовые учётные записи (после seed)

| Логин | Пароль | Роль |
|---|---|---|
| `admin` | `Admin1234!` | admin |
| `agent_ivanov` | `Agent1234!` | agent |
| `supervisor_petrov` | `Super1234!` | supervisor |

---

## Структура проекта

```
src/
├── auth/
│   ├── dto/auth.dto.ts
│   ├── strategies/
│   │   ├── jwt-access.strategy.ts
│   │   └── jwt-refresh.strategy.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   └── auth.module.ts
├── users/
│   ├── dto/user.dto.ts
│   ├── entities/user.entity.ts
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── users.module.ts
├── roles/
│   ├── dto/role.dto.ts
│   ├── entities/
│   │   ├── role.entity.ts
│   │   └── permission.entity.ts
│   ├── roles.controller.ts
│   ├── roles.service.ts
│   └── roles.module.ts
├── common/
│   ├── decorators/
│   │   ├── current-user.decorator.ts
│   │   └── roles.decorator.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   └── roles.guard.ts
│   └── filters/
│       └── all-exceptions.filter.ts
├── database/
│   └── seed.ts
├── app.module.ts
└── main.ts
```

---

## API эндпоинты

### Auth
| Method | URL | Описание |
|---|---|---|
| POST | `/api/v1/auth/login` | Получить access + refresh токены |
| POST | `/api/v1/auth/refresh` | Обновить access токен |
| POST | `/api/v1/auth/logout` | Завершить сессию |
| GET  | `/api/v1/auth/me` | Текущий пользователь |

### Users
| Method | URL | Описание |
|---|---|---|
| POST   | `/api/v1/users` | Создать (admin) |
| GET    | `/api/v1/users` | Список с пагинацией |
| GET    | `/api/v1/users/:id` | Один пользователь |
| PATCH  | `/api/v1/users/:id` | Обновить |
| DELETE | `/api/v1/users/:id` | Удалить (admin) |
| PATCH  | `/api/v1/users/:id/roles` | Назначить роли |

### Roles
| Method | URL | Описание |
|---|---|---|
| POST | `/api/v1/roles` | Создать роль |
| GET  | `/api/v1/roles` | Список ролей |
| PATCH | `/api/v1/roles/:id` | Обновить роль |
| DELETE | `/api/v1/roles/:id` | Удалить роль |
| PUT | `/api/v1/roles/:id/permissions` | Назначить права |
| POST | `/api/v1/roles/permissions` | Создать право |
| GET | `/api/v1/roles/permissions/list` | Список прав |

---

## Следующие модули

- `DebtorsModule` — CRUD должников + массовый импорт CSV
- `DebtCasesModule` — дела, DPD-фильтрация, история просрочки
- `NotificationsModule` — шаблоны + ручная отправка
- `SchedulerModule` — Bull Queue + Celery-аналог
- `PTPModule` — обещания об оплате
- `ReportsModule` — аналитика и дашборд
