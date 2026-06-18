import { PublicKey } from '@solana/web3.js';
import { PROGRAM_ID } from './setup';

export function deriveMarketPda(mintA: PublicKey, mintB: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('market'), mintA.toBuffer(), mintB.toBuffer()],
    PROGRAM_ID,
  );
}

export function deriveVaultAPda(market: PublicKey): PublicKey {
  const [vaultA] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault_a'), market.toBuffer()],
    PROGRAM_ID,
  );
  return vaultA;
}

export function deriveVaultBPda(market: PublicKey): PublicKey {
  const [vaultB] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault_b'), market.toBuffer()],
    PROGRAM_ID,
  );
  return vaultB;
}
