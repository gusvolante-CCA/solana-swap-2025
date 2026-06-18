import { useCallback, useEffect, useState } from 'react';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';
import { getProgram } from '../anchor/setup';
import { deriveMarketPda, deriveVaultAPda, deriveVaultBPda } from '../anchor/pda';

const STORAGE_KEY = 'solana-swap-market-config';

export interface MarketConfig {
  mintA: string;
  mintB: string;
}

export interface MarketState {
  authority: PublicKey;
  tokenMintA: PublicKey;
  tokenMintB: PublicKey;
  price: bigint;
  decimalsA: number;
  decimalsB: number;
  bump: number;
}

export function loadMarketConfig(): MarketConfig | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as MarketConfig;
  } catch {
    return null;
  }
}

export function saveMarketConfig(config: MarketConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function clearMarketConfig() {
  localStorage.removeItem(STORAGE_KEY);
}

async function safeBalance(connection: ReturnType<typeof useConnection>['connection'], ata: PublicKey): Promise<bigint | null> {
  try {
    const account = await getAccount(connection, ata);
    return account.amount;
  } catch {
    return null;
  }
}

export function useMarket(pollMs = 5000) {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const [config, setConfig] = useState<MarketConfig | null>(loadMarketConfig());
  const [market, setMarket] = useState<MarketState | null>(null);
  const [vaultABalance, setVaultABalance] = useState<bigint | null>(null);
  const [vaultBBalance, setVaultBBalance] = useState<bigint | null>(null);
  const [userTokenABalance, setUserTokenABalance] = useState<bigint | null>(null);
  const [userTokenBBalance, setUserTokenBBalance] = useState<bigint | null>(null);
  const [loading, setLoading] = useState(false);

  const derived = config
    ? (() => {
        const mintA = new PublicKey(config.mintA);
        const mintB = new PublicKey(config.mintB);
        const [marketPda] = deriveMarketPda(mintA, mintB);
        const vaultA = deriveVaultAPda(marketPda);
        const vaultB = deriveVaultBPda(marketPda);
        return { mintA, mintB, marketPda, vaultA, vaultB };
      })()
    : null;

  const refresh = useCallback(async () => {
    if (!derived) {
      setMarket(null);
      return;
    }
    setLoading(true);
    try {
      if (wallet) {
        const program = getProgram(wallet);
        try {
          const account = await (program.account as Record<string, { fetch: (pda: PublicKey) => Promise<unknown> }>).marketAccount.fetch(derived.marketPda);
          setMarket(account as unknown as MarketState);
        } catch {
          setMarket(null);
        }
      }

      const [vA, vB] = await Promise.all([
        safeBalance(connection, derived.vaultA),
        safeBalance(connection, derived.vaultB),
      ]);
      setVaultABalance(vA);
      setVaultBBalance(vB);

      if (wallet) {
        const [userAtaA, userAtaB] = await Promise.all([
          getAssociatedTokenAddress(derived.mintA, wallet.publicKey),
          getAssociatedTokenAddress(derived.mintB, wallet.publicKey),
        ]);
        const [uA, uB] = await Promise.all([
          safeBalance(connection, userAtaA),
          safeBalance(connection, userAtaB),
        ]);
        setUserTokenABalance(uA);
        setUserTokenBBalance(uB);
      }
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection, wallet, config?.mintA, config?.mintB]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, pollMs);
    return () => clearInterval(interval);
  }, [refresh, pollMs]);

  const setConfigAndSave = useCallback((newConfig: MarketConfig) => {
    saveMarketConfig(newConfig);
    setConfig(newConfig);
  }, []);

  const reset = useCallback(() => {
    clearMarketConfig();
    setConfig(null);
    setMarket(null);
  }, []);

  return {
    config,
    setConfig: setConfigAndSave,
    reset,
    derived,
    market,
    vaultABalance,
    vaultBBalance,
    userTokenABalance,
    userTokenBBalance,
    loading,
    refresh,
  };
}
