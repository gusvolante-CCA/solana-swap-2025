import type { MarketConfig, MarketState } from '../hooks/useMarket';
import { PRICE_DECIMAL_FACTOR } from '../anchor/setup';

interface Props {
  config: MarketConfig | null;
  market: MarketState | null;
  vaultABalance: bigint | null;
  vaultBBalance: bigint | null;
  derived: { marketPda: { toBase58(): string }; vaultA: { toBase58(): string }; vaultB: { toBase58(): string } } | null;
  loading: boolean;
}

function formatAmount(raw: bigint | null, decimals: number | undefined): string {
  if (raw === null || decimals === undefined) return '—';
  return (Number(raw) / 10 ** decimals).toLocaleString(undefined, { maximumFractionDigits: 6 });
}

export default function MarketDashboard({ config, market, vaultABalance, vaultBBalance, derived, loading }: Props) {
  if (!config || !derived) {
    return (
      <div className="panel p-6 text-center text-(--color-text-dim)">
        Todavía no configuraste un market. Ir a la pestaña <strong>Admin</strong> para inicializarlo.
      </div>
    );
  }

  if (!market) {
    return (
      <div className="panel p-6 text-center text-(--color-text-dim)">
        {loading ? 'Cargando market...' : 'El market configurado no existe on-chain todavía. Inicializalo desde la pestaña Admin.'}
      </div>
    );
  }

  const price = Number(market.price) / PRICE_DECIMAL_FACTOR;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="panel p-6">
        <h2 className="text-lg font-semibold mb-4">Estado del Market</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-(--color-text-dim)">Precio (A → B)</dt>
            <dd className="mono">1 A = {price} B</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-(--color-text-dim)">Decimales A / B</dt>
            <dd className="mono">{market.decimalsA} / {market.decimalsB}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-(--color-text-dim)">Authority</dt>
            <dd className="mono text-xs">{market.authority.toBase58().slice(0, 8)}...</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-(--color-text-dim)">Market PDA</dt>
            <dd className="mono text-xs">{derived.marketPda.toBase58().slice(0, 8)}...</dd>
          </div>
        </dl>
      </div>

      <div className="panel p-6">
        <h2 className="text-lg font-semibold mb-4">Liquidez (Vaults)</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-(--color-text-dim)">Vault A</dt>
            <dd className="mono">{formatAmount(vaultABalance, market.decimalsA)} A</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-(--color-text-dim)">Vault B</dt>
            <dd className="mono">{formatAmount(vaultBBalance, market.decimalsB)} B</dd>
          </div>
        </dl>
        {loading && <p className="text-xs text-(--color-text-dim) mt-4">Actualizando...</p>}
      </div>
    </div>
  );
}
