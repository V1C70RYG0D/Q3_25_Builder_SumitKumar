import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Turbin3Rust } from "../target/types/turbin3_rust";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createMint,
  createAccount,
  mintTo,
  getAccount,
  getAssociatedTokenAddress,
  createAssociatedTokenAccount,
} from "@solana/spl-token";
import { expect } from "chai";

describe("Staking System", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Turbin3Rust as Program<Turbin3Rust>;
  
  // Test accounts
  let user: Keypair;
  let mint: PublicKey;
  let stakingPool: Keypair;
  let rewardMint: PublicKey;
  let stakingPoolAta: PublicKey;
  let rewardPoolAta: PublicKey;
  let userStakeAta: PublicKey;
  let userRewardAta: PublicKey;
  let userStake: PublicKey;

  // Test constants
  const STAKING_POOL_SEED = "staking_pool";
  const USER_STAKE_SEED = "user_stake";
  const STAKE_AMOUNT = new anchor.BN(1000_000); // 1 token (6 decimals)
  const REWARD_RATE = new anchor.BN(100); // 100 rewards per second
  const MIN_STAKE_AMOUNT = new anchor.BN(100_000); // 0.1 token minimum

  before(async () => {
    // Generate test accounts
    user = Keypair.generate();
    stakingPool = Keypair.generate();

    // Airdrop SOL to user
    const signature = await provider.connection.requestAirdrop(
      user.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(signature);

    // Create stake token mint
    mint = await createMint(
      provider.connection,
      user,
      user.publicKey,
      null,
      6 // decimals
    );

    // Create reward token mint
    rewardMint = await createMint(
      provider.connection,
      user,
      user.publicKey,
      null,
      6 // decimals
    );

    // Get associated token accounts
    stakingPoolAta = await getAssociatedTokenAddress(mint, stakingPool.publicKey);
    rewardPoolAta = await getAssociatedTokenAddress(rewardMint, stakingPool.publicKey);
    userStakeAta = await getAssociatedTokenAddress(mint, user.publicKey);
    userRewardAta = await getAssociatedTokenAddress(rewardMint, user.publicKey);

    // Create user token accounts
    await createAssociatedTokenAccount(
      provider.connection,
      user,
      mint,
      user.publicKey
    );

    await createAssociatedTokenAccount(
      provider.connection,
      user,
      rewardMint,
      user.publicKey
    );

    // Mint tokens to user
    await mintTo(
      provider.connection,
      user,
      mint,
      userStakeAta,
      user,
      10_000_000 // 10 tokens
    );

    await mintTo(
      provider.connection,
      user,
      rewardMint,
      userRewardAta,
      user,
      100_000_000 // 100 reward tokens for funding pool
    );

    // Derive user stake PDA
    [userStake] = await PublicKey.findProgramAddress(
      [
        Buffer.from(USER_STAKE_SEED),
        stakingPool.publicKey.toBuffer(),
        user.publicKey.toBuffer(),
      ],
      program.programId
    );

    console.log("Test setup completed");
    console.log("User:", user.publicKey.toString());
    console.log("Stake mint:", mint.toString());
    console.log("Reward mint:", rewardMint.toString());
    console.log("Staking pool:", stakingPool.publicKey.toString());
    console.log("User stake PDA:", userStake.toString());
  });

  it("Initialize staking pool", async () => {
    try {
      const tx = await program.methods
        .initializeStakingPool(REWARD_RATE, MIN_STAKE_AMOUNT)
        .accounts({
          stakingPool: stakingPool.publicKey,
          stakeMint: mint,
          rewardMint: rewardMint,
          stakeVault: stakingPoolAta,
          rewardVault: rewardPoolAta,
          authority: user.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([stakingPool, user])
        .rpc();

      console.log("Initialize staking pool tx:", tx);

      // Verify the staking pool was created
      const poolAccount = await program.account.stakingPool.fetch(stakingPool.publicKey);
      expect(poolAccount.authority.toString()).to.equal(user.publicKey.toString());
      expect(poolAccount.stakeMint.toString()).to.equal(mint.toString());
      expect(poolAccount.rewardMint.toString()).to.equal(rewardMint.toString());
      expect(poolAccount.rewardRate.toString()).to.equal(REWARD_RATE.toString());
      expect(poolAccount.minStakeAmount.toString()).to.equal(MIN_STAKE_AMOUNT.toString());
      expect(poolAccount.totalStaked.toString()).to.equal("0");

      console.log("✅ Staking pool initialized successfully");
    } catch (error) {
      console.error("Initialize staking pool error:", error);
      throw error;
    }
  });

  it("Fund reward pool", async () => {
    try {
      const FUND_AMOUNT = new anchor.BN(50_000_000); // 50 reward tokens

      const tx = await program.methods
        .fundRewards(FUND_AMOUNT)
        .accounts({
          stakingPool: stakingPool.publicKey,
          rewardVault: rewardPoolAta,
          funderRewardAccount: userRewardAta,
          funder: user.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([user])
        .rpc();

      console.log("Fund rewards tx:", tx);

      // Verify reward vault has funds
      const rewardVaultAccount = await getAccount(provider.connection, rewardPoolAta);
      expect(rewardVaultAccount.amount.toString()).to.equal(FUND_AMOUNT.toString());

      console.log("✅ Reward pool funded successfully");
    } catch (error) {
      console.error("Fund rewards error:", error);
      throw error;
    }
  });

  it("Stake tokens", async () => {
    try {
      const tx = await program.methods
        .stakeTokens(STAKE_AMOUNT)
        .accounts({
          stakingPool: stakingPool.publicKey,
          userStake: userStake,
          stakeVault: stakingPoolAta,
          userStakeAccount: userStakeAta,
          user: user.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([user])
        .rpc();

      console.log("Stake tokens tx:", tx);

      // Verify user stake was created
      const userStakeAccount = await program.account.userStake.fetch(userStake);
      expect(userStakeAccount.user.toString()).to.equal(user.publicKey.toString());
      expect(userStakeAccount.stakingPool.toString()).to.equal(stakingPool.publicKey.toString());
      expect(userStakeAccount.amount.toString()).to.equal(STAKE_AMOUNT.toString());

      // Verify staking pool was updated
      const poolAccount = await program.account.stakingPool.fetch(stakingPool.publicKey);
      expect(poolAccount.totalStaked.toString()).to.equal(STAKE_AMOUNT.toString());

      // Verify tokens were transferred to vault
      const vaultAccount = await getAccount(provider.connection, stakingPoolAta);
      expect(vaultAccount.amount.toString()).to.equal(STAKE_AMOUNT.toString());

      console.log("✅ Tokens staked successfully");
    } catch (error) {
      console.error("Stake tokens error:", error);
      throw error;
    }
  });

  it("Add more stake", async () => {
    try {
      const ADDITIONAL_STAKE = new anchor.BN(500_000); // 0.5 tokens

      const tx = await program.methods
        .addStake(ADDITIONAL_STAKE)
        .accounts({
          stakingPool: stakingPool.publicKey,
          userStake: userStake,
          stakeVault: stakingPoolAta,
          userStakeAccount: userStakeAta,
          user: user.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([user])
        .rpc();

      console.log("Add stake tx:", tx);

      // Verify user stake amount increased
      const userStakeAccount = await program.account.userStake.fetch(userStake);
      const expectedTotal = STAKE_AMOUNT.add(ADDITIONAL_STAKE);
      expect(userStakeAccount.amount.toString()).to.equal(expectedTotal.toString());

      // Verify pool total increased
      const poolAccount = await program.account.stakingPool.fetch(stakingPool.publicKey);
      expect(poolAccount.totalStaked.toString()).to.equal(expectedTotal.toString());

      console.log("✅ Additional stake added successfully");
    } catch (error) {
      console.error("Add stake error:", error);
      throw error;
    }
  });

  it("Wait and claim rewards", async () => {
    try {
      // Wait a few seconds to accumulate rewards
      console.log("Waiting 3 seconds to accumulate rewards...");
      await new Promise(resolve => setTimeout(resolve, 3000));

      const tx = await program.methods
        .claimRewards()
        .accounts({
          stakingPool: stakingPool.publicKey,
          userStake: userStake,
          rewardVault: rewardPoolAta,
          userRewardAccount: userRewardAta,
          user: user.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([user])
        .rpc();

      console.log("Claim rewards tx:", tx);

      // Verify user received rewards
      const userRewardAccount = await getAccount(provider.connection, userRewardAta);
      console.log("User reward balance after claim:", userRewardAccount.amount.toString());

      // Should have some rewards (exact amount depends on timing)
      expect(Number(userRewardAccount.amount)).to.be.greaterThan(50_000_000); // More than initial 50M

      console.log("✅ Rewards claimed successfully");
    } catch (error) {
      console.error("Claim rewards error:", error);
      throw error;
    }
  });

  it("Partial unstake", async () => {
    try {
      const UNSTAKE_AMOUNT = new anchor.BN(750_000); // 0.75 tokens

      // Get initial balances
      const initialUserBalance = await getAccount(provider.connection, userStakeAta);
      const initialVaultBalance = await getAccount(provider.connection, stakingPoolAta);

      const tx = await program.methods
        .unstakeTokens(UNSTAKE_AMOUNT)
        .accounts({
          stakingPool: stakingPool.publicKey,
          userStake: userStake,
          stakeVault: stakingPoolAta,
          userStakeAccount: userStakeAta,
          user: user.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([user])
        .rpc();

      console.log("Unstake tokens tx:", tx);

      // Verify user stake decreased
      const userStakeAccount = await program.account.userStake.fetch(userStake);
      const expectedRemaining = STAKE_AMOUNT.add(new anchor.BN(500_000)).sub(UNSTAKE_AMOUNT);
      expect(userStakeAccount.amount.toString()).to.equal(expectedRemaining.toString());

      // Verify pool total decreased
      const poolAccount = await program.account.stakingPool.fetch(stakingPool.publicKey);
      expect(poolAccount.totalStaked.toString()).to.equal(expectedRemaining.toString());

      // Verify tokens returned to user
      const finalUserBalance = await getAccount(provider.connection, userStakeAta);
      const returnedTokens = Number(finalUserBalance.amount) - Number(initialUserBalance.amount);
      expect(returnedTokens).to.equal(Number(UNSTAKE_AMOUNT));

      console.log("✅ Partial unstake completed successfully");
    } catch (error) {
      console.error("Unstake tokens error:", error);
      throw error;
    }
  });

  it("Complete unstake", async () => {
    try {
      // Get remaining stake amount
      const userStakeAccount = await program.account.userStake.fetch(userStake);
      const remainingStake = userStakeAccount.amount;

      const tx = await program.methods
        .unstakeTokens(remainingStake)
        .accounts({
          stakingPool: stakingPool.publicKey,
          userStake: userStake,
          stakeVault: stakingPoolAta,
          userStakeAccount: userStakeAta,
          user: user.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([user])
        .rpc();

      console.log("Complete unstake tx:", tx);

      // Verify user stake is zero
      const finalUserStakeAccount = await program.account.userStake.fetch(userStake);
      expect(finalUserStakeAccount.amount.toString()).to.equal("0");

      // Verify pool total is zero
      const poolAccount = await program.account.stakingPool.fetch(stakingPool.publicKey);
      expect(poolAccount.totalStaked.toString()).to.equal("0");

      console.log("✅ Complete unstake completed successfully");
    } catch (error) {
      console.error("Complete unstake error:", error);
      throw error;
    }
  });
});
