#!/usr/bin/env bash
set -e

# ─── Configuración ────────────────────────────────────────────────────────────
ADMIN="8FW2HfoS7YqpFSkyt69QkRv1q2dXHnkDJSFPpBqTGiDy"
NO_ADMIN="69TJVifqAJzWxRFuDkphe34pHJypvmaYdf2542TDYaYX"
FEE_PAYER="$HOME/.config/solana/id.json"
ADMIN_AMOUNT=10000
NO_ADMIN_AMOUNT=1000
DECIMALS=6

# ─── Colores ──────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${CYAN}[setup]${NC} $1"; }
ok()   { echo -e "${GREEN}[ok]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }

# ─── 1. Validador ─────────────────────────────────────────────────────────────
log "Parando validador anterior (si existe)..."
pkill -f solana-test-validator 2>/dev/null || true
sleep 2

log "Iniciando solana-test-validator --reset..."
solana-test-validator --reset --quiet &
VALIDATOR_PID=$!

log "Esperando que el validador esté listo..."
for i in $(seq 1 30); do
  if solana cluster-version --url http://localhost:8899 &>/dev/null; then
    ok "Validador listo."
    break
  fi
  sleep 1
done

# ─── 2. Airdrop SOL a wallets Phantom ────────────────────────────────────────
log "Enviando SOL a Admin y No-Admin..."
solana airdrop 10 $ADMIN --url http://localhost:8899
solana airdrop 10 $NO_ADMIN --url http://localhost:8899
ok "Wallets fondeadas con SOL."

# ─── 3. Deploy ────────────────────────────────────────────────────────────────
log "Deployando programa Anchor..."
anchor deploy
ok "Programa deployado."

# ─── 3. Crear Mints ───────────────────────────────────────────────────────────
log "Creando Mint A..."
MINT_A=$(spl-token create-token --decimals $DECIMALS 2>&1 | grep "Address:" | awk '{print $2}')
ok "Mint A: $MINT_A"

log "Creando Mint B..."
MINT_B=$(spl-token create-token --decimals $DECIMALS 2>&1 | grep "Address:" | awk '{print $2}')
ok "Mint B: $MINT_B"

# ─── 4. Cuentas y tokens para Admin ──────────────────────────────────────────
log "Creando cuentas de token para Admin..."
spl-token create-account $MINT_A --owner $ADMIN --fee-payer $FEE_PAYER
spl-token create-account $MINT_B --owner $ADMIN --fee-payer $FEE_PAYER

log "Minteando $ADMIN_AMOUNT tokens A y B a Admin..."
spl-token mint $MINT_A $ADMIN_AMOUNT --recipient-owner $ADMIN --fee-payer $FEE_PAYER
spl-token mint $MINT_B $ADMIN_AMOUNT --recipient-owner $ADMIN --fee-payer $FEE_PAYER
ok "Admin fondeado."

# ─── 5. Cuentas y tokens para No-Admin ───────────────────────────────────────
log "Creando cuentas de token para No-Admin..."
spl-token create-account $MINT_A --owner $NO_ADMIN --fee-payer $FEE_PAYER
spl-token create-account $MINT_B --owner $NO_ADMIN --fee-payer $FEE_PAYER

log "Minteando $NO_ADMIN_AMOUNT tokens A y B a No-Admin..."
spl-token mint $MINT_A $NO_ADMIN_AMOUNT --recipient-owner $NO_ADMIN --fee-payer $FEE_PAYER
spl-token mint $MINT_B $NO_ADMIN_AMOUNT --recipient-owner $NO_ADMIN --fee-payer $FEE_PAYER
ok "No-Admin fondeado."

# ─── 6. Verificación ──────────────────────────────────────────────────────────
log "Verificando balances..."
echo ""
echo "Admin ($ADMIN):"
spl-token accounts --owner $ADMIN
echo ""
echo "No-Admin ($NO_ADMIN):"
spl-token accounts --owner $NO_ADMIN

# ─── 7. Resumen ───────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}  SETUP COMPLETO${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo -e "  MINT A: ${YELLOW}$MINT_A${NC}"
echo -e "  MINT B: ${YELLOW}$MINT_B${NC}"
echo ""
echo -e "  → Pegá estas direcciones en el frontend (tab Admin → Guardar mints)"
echo -e "  → Luego inicializá el market desde Phantom con precio 2.5 y decimals 6"
echo ""
echo -e "  Validador corriendo en background (PID $VALIDATOR_PID)"
echo -e "${GREEN}════════════════════════════════════════${NC}"
