# Wallet Service Backend Assessment

## Tech Stack
- NestJS 
- TypeScript
- SQLite

This project is a full-featured **wallet backend service** with wallet creation, wallet funding, transaction history, transfer from wallet to wallet and idempotent operations. Users can create wallets, fund them, view wallet details, transfer and track transactions securely.

> **Note:** This version does **not include user authentication**. Anyone can create multiple wallets, including multiple wallets with the same currency.

## Assumptions
* Multiple wallets **can be created with the same currency**.
* There is **no authentication**, so wallets are accessible by ID only.
* Wallet funding is **transactional** and ensures balance consistency.
* Transactions record the `amount`, `balanceBefore`, `balanceAfter`, `description`, and `status`.
* Idempotency key is pass via headers
* Transfer must be in the same currency

## Features
### Wallet Management
* Create wallet with a specific currency
* Retrieve all wallets
* Retrieve wallet details with transaction history
* Fund wallet with idempotency support
* Transfer from wallet to wallet
* Transaction tracking (balance before & after)
* Graceful error handling with validation

## API Endpoints Overview
### Wallet Endpoints

#### Create Wallet

`POST /api/v1/wallets`
**Body:**

```json
{
  "currency": "USD"
}
```
- currency is required

**Response:**

```json
{
  "success": true,
  "message": "Wallet created successfully",
  "data": {
    "id": "abc123",
    "currency": "USD",
    "balance": 0,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

#### Get All Wallets

`GET /api/v1/wallets`

**Response:**

```json
{
    "success": true,
    "message": "Wallets retrieved successfully",
    "data": [
        {
            "id": "4b6f7b83-b166-43de-9b65-72bbb9484fc5",
            "currency": "USD",
            "balance": 0,
            "createdAt": "2025-12-15T13:35:43.000Z",
            "updatedAt": "2025-12-15T13:35:43.000Z"
        }
    ]
}
```

#### Get Wallet Details

`GET /api/v1/wallets/:id`

**Response:**

```json
{
  "wallet": {
    "id": "abc123",
    "currency": "USD",
    "balance": 100
  },
  "transactions": [
    {
      "id": "txn123",
      "amount": 100,
      "balanceBefore": 0,
      "balanceAfter": 100,
      "description": "Initial funding",
      "status": "COMPLETED"
    }
  ]
}
```

#### Fund Wallet

`POST /api/v1/wallets/:id/fund`
**Body:**

```json
{
  "amount": 100,
  "description": "Initial funding"
}
```
- amount is required
- description is optional

**Response:**

```json
{
  "success": true,
  "message": "Wallet funded successfully",
  "data": {
    "wallet": {
      "id": "abc123",
      "currency": "USD",
      "balance": 100
    },
    "transaction": {
      "id": "txn123",
      "amount": 100,
      "balanceBefore": 0,
      "balanceAfter": 100,
      "description": "Initial funding",
      "status": "COMPLETED"
    }
  }
}
```

#### Transfer

`POST /api/v1/wallets/transfer`
**Body:**

```json
{
    "sourceWalletId": "f1dc59fa-0c69-464a-a701-6d79410f5ccf",
    "destinationWalletId": "6ad98903-5cea-455d-b9e8-74cfd452dfac",
    "amount": 10,
    "description": "for the weekend"
}
```
- sourceWalletId is required
- destinationWalletId is required
- amount is required
- description is optional

**Response:**

```json
{
    "success": true,
    "message": "Transfer completed successfully",
    "data": {
        "sourceWallet": {
            "id": "f1dc59fa-0c69-464a-a701-6d79410f5ccf",
            "currency": "USD",
            "balance": 30,
            "createdAt": "2025-12-15T10:33:33.000Z",
            "updatedAt": "2025-12-15T12:54:49.000Z"
        },
        "destinationWallet": {
            "id": "6ad98903-5cea-455d-b9e8-74cfd452dfac",
            "currency": "USD",
            "balance": 10,
            "createdAt": "2025-12-15T12:51:23.000Z",
            "updatedAt": "2025-12-15T12:54:49.000Z"
        },
        "transactions": [
            {
                "id": "692cc182-315d-470b-8a8c-5af8782433ee",
                "walletId": "f1dc59fa-0c69-464a-a701-6d79410f5ccf",
                "type": "DEBIT",
                "amount": 10,
                "balanceBefore": 40,
                "balanceAfter": 30,
                "reference": "TRF-1765803289268-b8vn9v0m4",
                "description": "for the weekend",
                "status": "COMPLETED",
                "createdAt": "2025-12-15T12:54:49.000Z"
            },
            {
                "id": "f4883a2b-fd94-48bd-bd96-dd2141433993",
                "walletId": "6ad98903-5cea-455d-b9e8-74cfd452dfac",
                "type": "CREDIT",
                "amount": 10,
                "balanceBefore": 0,
                "balanceAfter": 10,
                "reference": "TRF-1765803289268-b8vn9v0m4",
                "description": "for the weekend",
                "status": "COMPLETED",
                "createdAt": "2025-12-15T12:54:49.000Z"
            }
        ]
    }
}
```

#### Postman Collection
- https://documenter.getpostman.com/view/9698164/2sB3dTtTNs


### Getting Started

#### Install dependencies

```bash
npm install
```

#### Create an `.env` file

```bash
PORT=3000
```

#### Run the server

##### Development server

```bash
npm run start:dev
```

* Hot reload enabled at `http://localhost:3000/api/v1/...`.

#### Run Tests
```bash
npm run test
```

##### Production server with Docker

```bash
docker-compose up -d --build
```

* SQLite database will live **inside the container** at `/app/data/wallet.db`.
* Postgres or Mysql for real prod

#### View logs

```bash
docker logs -f wallet-service
```

### Scaling Notes

While this assessment uses SQLite and no user authentication, here’s how this system could scale in production:

#### Database Scaling

* Replace SQLite with a production-grade DB like **PostgreSQL** or **MySQL**.
* Use **connection pooling** and **indexes** on wallet IDs and transaction timestamps.
* Consider **partitioning or sharding** for very large numbers of wallets or transactions.

#### Concurrency & Transactions

* Keep wallet funding **transactional** using database transactions.
* Use **pessimistic or optimistic locking** to prevent race conditions.
* For horizontal scaling, ensure **distributed locks** (e.g., Redis) when multiple service instances access the same wallet.

#### Caching & Read Optimization

* Cache frequently read wallet balances in **Redis** to reduce DB load.

#### Microservices & Message Queues

* Offload heavy operations like notifications, analytics, or batch reporting to **background workers** via message queues (RabbitMQ, Kafka).

#### Monitoring & Logging

* Use **structured logging** (e.g., Winston, Pino) and monitoring tools (**Prometheus**, **Grafana**) to track wallet usage and detect anomalies.

#### API Scaling

* Deploy behind a **load balancer** with multiple service instances.
* Implement **rate limiting** to prevent abuse.
* Use **JWT or OAuth** for authentication in real-world scenarios.
