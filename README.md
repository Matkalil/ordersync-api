# ordersync-api

[![CI](https://github.com/Matkalil/ordersync-api/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/Matkalil/ordersync-api/actions/workflows/ci.yml)

Webhook integration service that receives e-commerce orders, validates and stores them idempotently in PostgreSQL, and exposes a secure REST API to query and update order status. Node.js, TypeScript, Express, Docker, Google Cloud Run.
