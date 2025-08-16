import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { BlueshiftAnchorVault } from "../target/types/blueshift_anchor_vault";

describe("Vault Operations", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.blueshiftAnchorVault as Program<BlueshiftAnchorVault>;

    describe("deposit", () => {
      it("should deposit SOL successfully", async () => {

      });

      it("It should fail with invalid amount", async () => {
        
      })
    });

    describe("withdraw", () => {
      it("should withdraw all SOL successfully", async () => {
       
      });
    });

});
