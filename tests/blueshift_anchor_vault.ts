import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { BlueshiftAnchorVault } from "../target/types/blueshift_anchor_vault";
import { assert } from "chai";

describe("vault operations", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.BlueshiftAnchorVault as Program<BlueshiftAnchorVault>;
  const provider = anchor.getProvider();
  const connection = provider.connection;


  const createFundedUser = async (sol = 2) => {
    const user = anchor.web3.Keypair.generate();
    const sig = await connection.requestAirdrop(user.publicKey, sol * anchor.web3.LAMPORTS_PER_SOL);
    await connection.confirmTransaction(sig);
    console.log("Funded user:", user.publicKey.toBase58(), "with", sol, "SOL");
    return user;
  };

  const getVaultPda = (user: anchor.web3.Keypair) => {
    const [vaultPda, vaultBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), user.publicKey.toBuffer()],
      program.programId
    );
    console.log("Vault PDA:", vaultPda.toBase58(), "Bump:", vaultBump);
    return [vaultPda, vaultBump] as const;
  };

  describe("deposit", () => {
    it("deposits SOL successfully", async () => {
      const user = await createFundedUser();
      const [vaultPda] = getVaultPda(user);

      const depositAmount = new anchor.BN(anchor.web3.LAMPORTS_PER_SOL);
      console.log("Deposit amount:", depositAmount.toString());

      const tx = await program.methods
        .deposit(depositAmount)
        .accounts({
          signer: user.publicKey,
          vault: vaultPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([user])
        .rpc();

      console.log("Deposit tx signature:", tx);

      const vaultBalance = await connection.getBalance(vaultPda);
      console.log("Vault balance after deposit:", vaultBalance);
      assert.equal(vaultBalance, depositAmount.toNumber(), "Vault should hold deposited SOL");

      const userBalance = await connection.getBalance(user.publicKey);
      console.log("User balance after deposit:", userBalance);
      assert.isBelow(userBalance, 2 * anchor.web3.LAMPORTS_PER_SOL, "User should have less after deposit");
    });

    it("fails with invalid amount", async () => {
      const user = await createFundedUser();
      const [vaultPda] = getVaultPda(user);

      const badAmount = new anchor.BN(0);
      console.log("Attempting invalid deposit amount:", badAmount.toString());

      try {
        await program.methods
          .deposit(badAmount)
          .accounts({
            signer: user.publicKey,
            vault: vaultPda,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([user])
          .rpc();

        assert.fail("Deposit should have failed");
      } catch (err: any) {
        console.log("Caught expected error:", err.error.errorCode.code);
        assert.equal(err.error.errorCode.code, "InvalidAmount");
      }
    });
  });

  describe("withdraw", () => {
    it("withdraws all SOL successfully", async () => {
      const user = await createFundedUser();
      const [vaultPda] = getVaultPda(user);

      const depositAmount = new anchor.BN(anchor.web3.LAMPORTS_PER_SOL);

      console.log("Depositing first to set up withdraw test...");
      const txDeposit = await program.methods
        .deposit(depositAmount)
        .accounts({
          signer: user.publicKey,
          vault: vaultPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([user])
        .rpc();
      console.log("Deposit tx signature:", txDeposit);

      const balanceBefore = await connection.getBalance(user.publicKey);
      console.log("User balance before withdraw:", balanceBefore);

      const vaultBalanceBefore = await connection.getBalance(vaultPda);
      console.log("Vault balance before withdraw:", vaultBalanceBefore);

      const txWithdraw = await program.methods
        .withdraw()
        .accounts({
          signer: user.publicKey,
          vault: vaultPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([user])
        .rpc();
      console.log("Withdraw tx signature:", txWithdraw);

      const vaultBalanceAfter = await connection.getBalance(vaultPda);
      console.log("Vault balance after withdraw:", vaultBalanceAfter);
      assert.equal(vaultBalanceAfter, 0, "Vault should be empty after withdraw");

      const balanceAfter = await connection.getBalance(user.publicKey);
      console.log("User balance after withdraw:", balanceAfter);
      assert.isAbove(balanceAfter, balanceBefore, "User should regain withdrawn SOL");
    });
  });
});
