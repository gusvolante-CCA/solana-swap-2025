import { useMemo, useState } from 'react';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import { BN } from '@coral-xyz/anchor';
import { getProgram, PRICE_DECIMAL_FACTOR } from '../anchor/setup';
import { deriveMarketPda, deriveVaultAPda, deriveVaultBPda } from '../anchor/pda';
import type { MarketConfig, MarketState } from '../hooks/useMarket';
import { addTxEntry } from '../lib/history';

interface Props {
  config: MarketConfig | null;
  market: MarketState | null;
  userTokenABalance: bigint | null;
  userTokenBBalance: bigint | null;
  refresh: () => Promise<void>;
}

function formatAmount(raw: bigint | null, decimals: number | undefined): string {
  if (raw === null || decimals === undefined) return '—';
  return (Number(raw) / 10 ** decimals).toLocaleString(undefined, { maximumFractionDigits: 6 });
}

export default function SwapPanel({ config, market, userTokenABalance, userTokenBBalance, refresh }: Props) {
  const wallet = useAnchorWallet();
  const [aToB, setAToB] = useState(true);
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const preview = useMemo(() => {
    if (!market || !amount) return null;
    const inputDecimals = aToB ? market.decimalsA : market.decimalsB;
    const outputDecimals = aToB ? market.decimalsB : market.decimalsA;
    const amountRaw = BigInt(Math.round(parseFloat(amount) * 10 ** inputDecimals));
    if (amountRaw <= 0n) return null;
    const price = BigInt(market.price.toString());

    let outRaw: bigint;
    if (aToB) {
      outRaw = (amountRaw * price) / BigInt(PRICE_DECIMAL_FACTOR);
    } else {
      if (price === 0n) return null;
      outRaw = (amountRaw * BigInt(PRICE_DECIMAL_FACTOR)) / price;
    }
    return Number(outRaw) / 10 ** outputDecimals;
  }, [market, amount, aToB]);

  async function handleSwap(e: React.FormEvent) {
    e.preventDefault();
    if (!wallet || !config || !market || !amount) return;
    setBusy(true);
    setStatus(null);
    try {
      const program = getProgram(wallet);
      const mintAKey = new PublicKey(config.mintA);
      const mintBKey = new PublicKey(config.mintB);
      const [marketPda] = deriveMarketPda(mintAKey, mintBKey);
      const vaultA = deriveVaultAPda(marketPda);
      const vaultB = deriveVaultBPda(marketPda);

      const [userTokenA, userTokenB] = await Promise.all([
        getAssociatedTokenAddress(mintAKey, wallet.publicKey),
        getAssociatedTokenAddress(mintBKey, wallet.publicKey),
      ]);

      const inputDecimals = aToB ? market.decimalsA : market.decimalsB;
      const amountRaw = Math.round(parseFloat(amount) * 10 ** inputDecimals);

      const sig = await program.methods
        .swap(new BN(amountRaw), aToB)
        .accounts({
          tokenMintA: mintAKey,
          tokenMintB: mintBKey,
          market: marketPda,
          vaultA,
          vaultB,
          userTokenA,
          userTokenB,
          user: wallet.publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc();

      addTxEntry({
        signature: sig,
        type: 'swap',
        detail: aToB ? `${amount} A → B` : `${amount} B → A`,
        timestamp: Date.now(),
      });
      setStatus(`Swap ejecutado. Tx: ${sig}`);
      setAmount('');
      await refresh();
    } catch (err) {
      setStatus(`Error: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  if (!wallet) {
    return <div className="panel p-6 text-center text-(--color-text-dim)">Conectá tu wallet para hacer swap.</div>;
  }

  if (!config || !market) {
    return <div className="panel p-6 text-center text-(--color-text-dim)">El market todavía no está inicializado. Ir a Admin.</div>;
  }

  return (
    <div className="panel p-6 max-w-md mx-auto">
      <h2 className="text-lg font-semibold mb-4">Swap</h2>

      <div className="flex justify-between text-sm mb-4 mono text-(--color-text-dim)">
        <span>Balance A: {formatAmount(userTokenABalance, market.decimalsA)}</span>
        <span>Balance B: {formatAmount(userTokenBBalance, market.decimalsB)}</span>
      </div>

      <form onSubmit={handleSwap} className="space-y-3">
        <label className="text-sm block">
          Entregás ({aToB ? 'Token A' : 'Token B'})
          <input
            className="input-field mt-1"
            type="number"
            step="any"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
          />
        </label>

        <div className="flex justify-center">
          <button
            type="button"
            className="text-sm px-3 py-1 rounded-full border border-(--color-panel-border) text-(--color-text-dim) hover:text-(--color-text)"
            onClick={() => setAToB((v) => !v)}
          >
            ⇄ cambiar dirección
          </button>
        </div>

        <div className="text-sm">
          Recibís ({aToB ? 'Token B' : 'Token A'}):{' '}
          <span className="mono">{preview !== null ? preview.toLocaleString(undefined, { maximumFractionDigits: 6 }) : '—'}</span>
        </div>

        <button type="submit" className="btn-primary w-full" disabled={busy || !amount}>
          {busy ? 'Procesando...' : 'Swap'}
        </button>
      </form>

      {status && <div className="mt-4 text-sm mono break-all">{status}</div>}
    </div>
  );
}
