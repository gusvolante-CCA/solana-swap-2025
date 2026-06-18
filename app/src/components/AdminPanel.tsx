import { useState } from 'react';
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
  setConfig: (config: MarketConfig) => void;
  reset: () => void;
  refresh: () => Promise<void>;
}

export default function AdminPanel({ config, market, setConfig, reset, refresh }: Props) {
  const wallet = useAnchorWallet();
  const [mintA, setMintA] = useState(config?.mintA ?? '');
  const [mintB, setMintB] = useState(config?.mintB ?? '');
  const [decimalsA, setDecimalsA] = useState('6');
  const [decimalsB, setDecimalsB] = useState('6');
  const [initialPrice, setInitialPrice] = useState('1');
  const [newPrice, setNewPrice] = useState('');
  const [liquidityA, setLiquidityA] = useState('');
  const [liquidityB, setLiquidityB] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isAuthority = !!(wallet && market && market.authority.equals(wallet.publicKey));

  async function handleSaveMints(e: React.FormEvent) {
    e.preventDefault();
    try {
      new PublicKey(mintA);
      new PublicKey(mintB);
    } catch {
      setStatus('Direcciones de mint inválidas.');
      return;
    }
    setConfig({ mintA, mintB });
    setStatus('Configuración guardada. Buscando market on-chain...');
    await refresh();
  }

  async function handleInitializeMarket(e: React.FormEvent) {
    e.preventDefault();
    if (!wallet) {
      setStatus('Conectá tu wallet primero.');
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const program = getProgram(wallet);
      const mintAKey = new PublicKey(mintA);
      const mintBKey = new PublicKey(mintB);
      const [marketPda, bump] = deriveMarketPda(mintAKey, mintBKey);
      const vaultA = deriveVaultAPda(marketPda);
      const vaultB = deriveVaultBPda(marketPda);

      const priceScaled = Math.round(parseFloat(initialPrice) * PRICE_DECIMAL_FACTOR);

      const sig = await program.methods
        .initializeMarket(
          new BN(priceScaled),
          parseInt(decimalsA, 10),
          parseInt(decimalsB, 10),
          bump,
        )
        .accounts({
          market: marketPda,
          tokenMintA: mintAKey,
          tokenMintB: mintBKey,
          vaultA,
          vaultB,
          authority: wallet.publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc();

      addTxEntry({ signature: sig, type: 'initialize_market', detail: `precio inicial ${initialPrice}`, timestamp: Date.now() });
      setStatus(`Market inicializado. Tx: ${sig}`);
      await refresh();
    } catch (err) {
      setStatus(`Error: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleSetPrice(e: React.FormEvent) {
    e.preventDefault();
    if (!wallet || !config) return;
    setBusy(true);
    setStatus(null);
    try {
      const program = getProgram(wallet);
      const mintAKey = new PublicKey(config.mintA);
      const mintBKey = new PublicKey(config.mintB);
      const priceScaled = Math.round(parseFloat(newPrice) * PRICE_DECIMAL_FACTOR);

      const sig = await program.methods
        .setPrice(new BN(priceScaled))
        .accounts({
          tokenMintA: mintAKey,
          tokenMintB: mintBKey,
          authority: wallet.publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc();

      addTxEntry({ signature: sig, type: 'set_price', detail: `nuevo precio ${newPrice}`, timestamp: Date.now() });
      setStatus(`Precio actualizado. Tx: ${sig}`);
      setNewPrice('');
      await refresh();
    } catch (err) {
      setStatus(`Error: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleAddLiquidity(e: React.FormEvent) {
    e.preventDefault();
    if (!wallet || !config || !market) return;
    setBusy(true);
    setStatus(null);
    try {
      const program = getProgram(wallet);
      const mintAKey = new PublicKey(config.mintA);
      const mintBKey = new PublicKey(config.mintB);
      const [marketPda] = deriveMarketPda(mintAKey, mintBKey);
      const vaultA = deriveVaultAPda(marketPda);
      const vaultB = deriveVaultBPda(marketPda);

      const [authorityTokenA, authorityTokenB] = await Promise.all([
        getAssociatedTokenAddress(mintAKey, wallet.publicKey),
        getAssociatedTokenAddress(mintBKey, wallet.publicKey),
      ]);

      const amountA = liquidityA ? Math.round(parseFloat(liquidityA) * 10 ** market.decimalsA) : 0;
      const amountB = liquidityB ? Math.round(parseFloat(liquidityB) * 10 ** market.decimalsB) : 0;

      const sig = await program.methods
        .addLiquidity(new BN(amountA), new BN(amountB))
        .accounts({
          tokenMintA: mintAKey,
          tokenMintB: mintBKey,
          market: marketPda,
          vaultA,
          vaultB,
          autorityTokenA: authorityTokenA,
          autorityTokenB: authorityTokenB,
          authority: wallet.publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      addTxEntry({ signature: sig, type: 'add_liquidity', detail: `+${liquidityA || 0} A, +${liquidityB || 0} B`, timestamp: Date.now() });
      setStatus(`Liquidez agregada. Tx: ${sig}`);
      setLiquidityA('');
      setLiquidityB('');
      await refresh();
    } catch (err) {
      setStatus(`Error: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  if (!wallet) {
    return <div className="panel p-6 text-center text-(--color-text-dim)">Conectá tu wallet para administrar el market.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="panel p-6">
        <h2 className="text-lg font-semibold mb-2">1. Mints del market</h2>
        <p className="text-sm text-(--color-text-dim) mb-4">
          Pegá las direcciones de los Token Mints A y B (creados previamente con <code className="mono">spl-token create-token</code>).
        </p>
        <form onSubmit={handleSaveMints} className="grid gap-3 md:grid-cols-2">
          <input className="input-field mono" placeholder="Mint A" value={mintA} onChange={(e) => setMintA(e.target.value)} />
          <input className="input-field mono" placeholder="Mint B" value={mintB} onChange={(e) => setMintB(e.target.value)} />
          <div className="md:col-span-2 flex gap-2">
            <button type="submit" className="btn-primary">Guardar mints</button>
            {config && (
              <button type="button" className="btn-primary" style={{ background: '#374151' }} onClick={reset}>
                Limpiar configuración
              </button>
            )}
          </div>
        </form>
      </div>

      {config && !market && (
        <div className="panel p-6">
          <h2 className="text-lg font-semibold mb-2">2. Inicializar market</h2>
          <form onSubmit={handleInitializeMarket} className="grid gap-3 md:grid-cols-3">
            <label className="text-sm">
              Decimales A
              <input className="input-field mt-1" type="number" value={decimalsA} onChange={(e) => setDecimalsA(e.target.value)} />
            </label>
            <label className="text-sm">
              Decimales B
              <input className="input-field mt-1" type="number" value={decimalsB} onChange={(e) => setDecimalsB(e.target.value)} />
            </label>
            <label className="text-sm">
              Precio inicial (1 A = ? B)
              <input className="input-field mt-1" type="number" step="0.000001" value={initialPrice} onChange={(e) => setInitialPrice(e.target.value)} />
            </label>
            <div className="md:col-span-3">
              <button type="submit" className="btn-primary" disabled={busy}>Inicializar market</button>
            </div>
          </form>
        </div>
      )}

      {config && market && isAuthority && (
        <>
          <div className="panel p-6">
            <h2 className="text-lg font-semibold mb-2">Cambiar precio</h2>
            <form onSubmit={handleSetPrice} className="flex gap-3 items-end">
              <label className="text-sm flex-1">
                Nuevo precio (1 A = ? B)
                <input className="input-field mt-1" type="number" step="0.000001" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />
              </label>
              <button type="submit" className="btn-primary" disabled={busy || !newPrice}>Actualizar</button>
            </form>
          </div>

          <div className="panel p-6">
            <h2 className="text-lg font-semibold mb-2">Agregar liquidez</h2>
            <form onSubmit={handleAddLiquidity} className="grid gap-3 md:grid-cols-3">
              <label className="text-sm">
                Cantidad A
                <input className="input-field mt-1" type="number" step="any" value={liquidityA} onChange={(e) => setLiquidityA(e.target.value)} />
              </label>
              <label className="text-sm">
                Cantidad B
                <input className="input-field mt-1" type="number" step="any" value={liquidityB} onChange={(e) => setLiquidityB(e.target.value)} />
              </label>
              <div className="flex items-end">
                <button type="submit" className="btn-primary" disabled={busy}>Agregar liquidez</button>
              </div>
            </form>
          </div>
        </>
      )}

      {config && market && !isAuthority && (
        <div className="panel p-6 text-(--color-text-dim) text-sm">
          Esta wallet no es la authority del market ({market.authority.toBase58()}), así que no puede
          cambiar el precio ni agregar liquidez.
        </div>
      )}

      {status && <div className="panel p-4 text-sm mono break-all">{status}</div>}
    </div>
  );
}
