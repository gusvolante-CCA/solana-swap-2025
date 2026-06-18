import { AnchorProvider, Program, type Idl } from '@coral-xyz/anchor';
import type { AnchorWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey } from '@solana/web3.js';
import idl from '../idl/solana_swap_2025.json';

export const PROGRAM_ID = new PublicKey(idl.address);

export const CLUSTER_URL = import.meta.env.VITE_CLUSTER_URL ?? 'http://127.0.0.1:8899';

export function getConnection(): Connection {
  return new Connection(CLUSTER_URL, 'confirmed');
}

export function getProgram(wallet: AnchorWallet): Program {
  const connection = getConnection();
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  return new Program(idl as Idl, provider);
}

export const PRICE_DECIMAL_FACTOR = 10 ** 6;
