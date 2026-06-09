# SyncFlow: Modular Order API

> A clean, service-oriented order management system built with **NestJS** and **TypeScript**.
> Designed for maintainability, strict typing, and clear separation of concerns.

---

## 🎯 The Philosophy

SyncFlow is built on the principle of **Modular Service-Oriented Architecture**.

Complex business logic does not require complex infrastructure. By leveraging **Dependency Injection** and clearly defined module boundaries, SyncFlow proves that a well-structured SOA system is readable, testable, and highly maintainable — without the overhead of asynchronous messaging infrastructure.

Each service owns its domain. Each module has one responsibility. The result is a codebase that any engineer can open, understand, and extend on day one.

---

## 🏗️ Architecture

We follow the standard NestJS layered approach, ensuring each module is fully responsible for its own domain logic and nothing else.

```
src/
├── orders/
│   ├── orders.module.ts
│   ├── orders.controller.ts
│   ├── orders.service.ts
│   ├── dto/
│   │   ├── create-order.dto.ts
│   │   └── update-order.dto.ts
│   └── entities/
│       └── order.entity.ts
├── inventory/
│   ├── inventory.module.ts
│   ├── inventory.service.ts
│   └── entities/
│       └── product.entity.ts
├── notifications/
│   ├── notifications.module.ts
│   ├── notifications.service.ts
│   └── notification.interface.ts   # provider-agnostic contract + DI token
├── health/
│   ├── health.module.ts
│   └── health.controller.ts        # liveness + DB readiness probe
├── common/
│   └── filters/
│       └── http-exception.filter.ts # consistent error responses
├── database/
│   └── database.module.ts          # TypeORM + SQLite configuration
├── app.module.ts
└── main.ts
```

### Core Domain Modules

**Order Module**
Acts as the orchestrator. It handles the full transaction flow — from receiving the request, through stock validation, to sending the final confirmation. It coordinates `InventoryService` and `NotificationService` via constructor injection, keeping the flow readable and synchronous.

**Inventory Module**
Encapsulates all stock logic. It validates availability and manages reservation locks, ensuring data integrity without leaking business rules into the Order layer.

**Notification Module**
A dedicated service for user communication. The Orders layer depends only on the `INotificationService` interface (bound through the `NOTIFICATION_SERVICE` injection token), so the underlying provider (Email → SMS → Push) can be swapped by binding a different implementation — without touching a single line of core business logic. Notification delivery is treated as a side effect: a failure is logged and isolated so it can never roll back a successfully placed order.

---

## 🧪 What This Project Demonstrates

This system is built to show that you understand how to write backend software that scales with a team, not just with traffic.

| Concept | Implementation |
|---|---|
| **SOLID Principles** | Single Responsibility enforced at every layer — one class, one concern |
| **Dependency Injection** | Full use of the NestJS IoC container for loose coupling |
| **Clean API Design** | DTOs with `class-validator` enforce strict, self-documenting request schemas |
| **Modular Boundaries** | No module reaches into another module's internals |
| **Testability** | Services are injected, not instantiated — easy to mock and test in isolation |
| **TypeScript Strictness** | Full strict mode — no `any`, no implicit types |

---

## 🚀 Getting Started

### Prerequisites

- Node.js `v20+`
- npm `v9+`

### Run Locally

**1. Clone the repository**
```bash
git clone https://github.com/0marii/syncflow-order-api.git
cd syncflow-order-api
```

**2. Install dependencies**
```bash
npm install
```

**3. Configure environment variables**
```bash
cp .env.example .env
```

All variables have sensible defaults, so this step is optional for local development.

**4. Start the development server**
```bash
npm run start:dev
```

The API will be available at `http://localhost:3000`, and interactive Swagger
documentation at `http://localhost:3000/docs`.

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP port the API listens on |
| `DATABASE_PATH` | `syncflow.sqlite` | SQLite file path (use `:memory:` for ephemeral storage) |
| `NODE_ENV` | `development` | When `production`, disables TypeORM schema auto-sync |

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/orders` | Create a new order |
| `GET` | `/orders` | Retrieve all orders |
| `GET` | `/orders/:id` | Retrieve a single order by ID |
| `PATCH` | `/orders/:id` | Update an order |
| `DELETE` | `/orders/:id` | Delete an order |
| `GET` | `/health` | Liveness and database readiness probe |
| `GET` | `/docs` | Interactive Swagger / OpenAPI documentation |

### Example Request — Create Order

```http
POST /orders
Content-Type: application/json

{
  "productId": "prod_abc123",
  "quantity": 2,
  "userId": "user_xyz789"
}
```

### Example Response

```json
{
  "id": "ord_001",
  "productId": "prod_abc123",
  "quantity": 2,
  "userId": "user_xyz789",
  "status": "CONFIRMED",
  "createdAt": "2026-01-15T10:30:00.000Z"
}
```

---

## 🧩 How a Request Flows Through the System

```
Client
  │
  ▼
OrdersController        ← validates request shape via DTO
  │
  ▼
OrdersService           ← orchestrates the business logic
  ├──▶ InventoryService.checkAndReserve()      ← validates & locks stock
  └──▶ NotificationService.sendConfirmation()  ← notifies the user
  │
  ▼
Response returned to Client
```

Everything is synchronous, predictable, and easy to trace in a debugger or a code review.

---

## 🔒 Data Integrity & Concurrency

Stock is a shared resource, so the system is designed to stay correct under concurrent load:

- **Atomic reservations** — `InventoryService.checkAndReserve()` reserves stock with a single conditional `UPDATE ... WHERE stock >= :quantity`. The check and the decrement happen as one indivisible operation, so two simultaneous orders can never both pass and oversell the same units.
- **Transactional orchestration** — creating, updating, and deleting an order runs inside a database transaction. If updating an order requires re-reserving stock and that fails, the transaction rolls back, leaving inventory and orders perfectly consistent.
- **Isolated side effects** — notifications run outside the order transaction. A delivery failure is logged but never rolls back a successfully placed order.

---

## ✅ Validation

All incoming requests are validated using `class-validator` and `class-transformer` before they reach the service layer.

```typescript
// create-order.dto.ts
import { IsString, IsInt, Min, IsNotEmpty } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsString()
  @IsNotEmpty()
  userId: string;
}
```

Invalid requests are rejected automatically with a descriptive `400 Bad Request` response — no manual validation logic required.

---

## 🧪 Testing

Services are designed with injection in mind, making them straightforward to mock and test in complete isolation.

```bash
# Run all unit and integration tests
npm run test

# Generate a coverage report
npm run test:cov
```

> **Coverage target: ≥ 80%**

### Testing Philosophy

Because every dependency is injected, testing `OrdersService` does not require a real `InventoryService`. You provide a mock, and you test one concern at a time — exactly as SOLID principles intend.

```typescript
const mockInventoryService = {
  checkAndReserve: jest.fn().mockResolvedValue(true),
};

const module = await Test.createTestingModule({
  providers: [
    OrdersService,
    { provide: InventoryService, useValue: mockInventoryService },
  ],
}).compile();
```

---

## 🗺️ Execution Roadmap

- [x] Phase 1: **Foundation** — NestJS project setup, module scaffolding, `Order` entity definition
- [x] Phase 2: **Domain Logic** — `InventoryService` with atomic stock validation and reservation logic
- [x] Phase 3: **Integration** — Wire `OrdersService` to `InventoryService` and `NotificationService` via DI
- [x] Phase 4: **Validation** — Full request validation using `class-validator` on all DTOs
- [x] Phase 5: **Reliability** — Comprehensive unit tests, integration tests, and coverage report
- [x] Phase 6: **Persistence & Polish** — TypeORM + SQLite, Swagger docs, health checks, global error handling

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| **NestJS** | Framework — modules, controllers, services, DI container |
| **TypeScript** | Strict typing across the entire codebase |
| **TypeORM** | Persistence layer and transactional data access |
| **SQLite** (better-sqlite3) | Zero-config embedded database |
| **class-validator** | Declarative DTO validation |
| **class-transformer** | Request payload transformation |
| **@nestjs/config** | Environment-based configuration |
| **@nestjs/swagger** | OpenAPI documentation at `/docs` |
| **@nestjs/terminus** | Health checks at `/health` |
| **Jest** | Unit and integration testing |
| **ESLint + Prettier** | Code quality and consistent formatting |

---

## 📝 License

Distributed under the **MIT License**. See `LICENSE` for details.

---

© 2026 Mohammad Al Omari
