# Entrega — SOLANA SWAP 2025
**Master Blockchain 360 · CodeCrypto Academy**
Alumno: Gus Volante · 2026-06-17

---

## ¿Qué se implementó?

El proyecto parte del repo base `codecrypto-academy/solana-swap-2025` (mini-DEX con Anchor en Solana).

**Tarea asignada:** implementar el bloque `else` de la función `swap()` para habilitar el swap inverso (Token B → Token A).

### Cambios en el smart contract (`programs/solana-swap-2025/src/lib.rs`)

- Bloque `else` de `swap()` completo:
  1. Transferencia de Token B del usuario al `vault_b` (firmada por el usuario)
  2. Cálculo inverso del monto a recibir en Token A: `amount_a = amount / price * 10^decimals_a` (aritmética `checked_*` para evitar overflow)
  3. Transferencia desde `vault_a` al usuario firmada por el PDA `market`

### Tests (`tests/solana-swap-2025.ts`)

Agregado el 5to test: **"Should reverse swap (B to A)"**

Resultado: **5/5 tests pasando** con `anchor test`.

### Frontend (`app/`)

Interfaz React + Vite + TypeScript + Tailwind con cuatro pantallas:
- **Dashboard** — precio, decimales, balances de vaults, polling cada 5 s
- **Admin** — `initialize_market`, `set_price`, `add_liquidity` (solo visible para la wallet `authority`)
- **Swap** — bidireccional A↔B con preview client-side de la fórmula del contrato
- **Historial** — transacciones en localStorage con link al Solana Explorer

### Script de setup (`setup.sh`)

Script de shell que automatiza el entorno de demo:
1. Para y resetea el validador local
2. Airdropea SOL a las wallets Admin y No-Admin
3. Deploya el programa Anchor
4. Crea los Mints A y B (decimales 6)
5. Crea cuentas de token y mintea fondos a Admin (10 000) y No-Admin (1 000)
6. Muestra un resumen con las addresses de los mints listos para pegar en el frontend

---

## Videos de demostración

**Parte 1 — Cuenta Admin** (initialize market · add liquidity · swap A→B · swap B→A)
https://www.loom.com/share/b7eb1a4e36464754a0f0a83b0a9f9bb8

**Parte 2 — Cuenta No-Admin** (swap desde wallet sin permisos de admin)
https://www.loom.com/share/ded9d360913d4a2386bf14e57a4b6137

---

## Cómo reproducir el entorno

> Requiere: WSL2 Ubuntu, Rust, Solana CLI, Anchor CLI (avm), Node.js, Yarn, Phantom en Localnet.

```bash
# 1. Clonar y entrar al proyecto
git clone https://github.com/codecrypto-academy/gusvolante-CCA.git
cd gusvolante-CCA/solana-swap-2025

# 2. Instalar dependencias
yarn install

# 3. Levantar entorno completo (validador + deploy + mints + fondos)
chmod +x setup.sh && ./setup.sh

# 4. Correr los tests
anchor test --skip-local-validator

# 5. Levantar el frontend (desde la carpeta app/)
cd ../app && yarn dev
```

Pegar los valores de `MINT A` y `MINT B` del output de `setup.sh` en el tab Admin del frontend → Guardar mints → Inicializar market.

---

## Pull Request

https://github.com/codecrypto-academy/gusvolante-CCA/pull/1
