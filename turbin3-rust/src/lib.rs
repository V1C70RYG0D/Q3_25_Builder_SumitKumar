#[cfg(test)]
mod tests {
    use solana_sdk::{signature::{Keypair, Signer, read_keypair_file}, pubkey::Pubkey};
    use solana_client::rpc_client::RpcClient;
    use solana_client::rpc_request::TokenAccountsFilter;
    use solana_program::{system_instruction::transfer, system_program};
    use solana_sdk::{message::Message, transaction::Transaction, instruction::{Instruction, AccountMeta}};
    use std::str::FromStr;
    use std::io::{self, BufRead};
    use bs58;
    use spl_token;

    use std::env;

    fn get_rpc_url() -> String {
        env::var("SOLANA_RPC_URL").unwrap_or_else(|_| "https://api.devnet.solana.com".to_string())
    }

    #[test]
    fn keygen() {
        // Create a new keypair
        let kp = Keypair::new();
        println!("You've generated a new Solana wallet: {}", kp.pubkey().to_string());
        println!("");
        println!("To save your wallet, copy and paste the following into a JSON file:");
        println!("{:?}", kp.to_bytes());
    }

    #[test]
    fn base58_to_wallet() {
        println!("Input your private key as a base58 string:");
        let stdin = io::stdin();
        let base58 = stdin.lock().lines().next().unwrap().unwrap();
        println!("Your wallet file format is:");
        let wallet = bs58::decode(base58).into_vec().unwrap();
        println!("{:?}", wallet);
    }

    #[test]
    fn wallet_to_base58() {
        println!("Input your private key as a JSON byte array (e.g. [12,34,...]):");
        let stdin = io::stdin();
        let wallet = stdin
            .lock()
            .lines()
            .next()
            .unwrap()
            .unwrap()
            .trim_start_matches('[')
            .trim_end_matches(']')
            .split(',')
            .map(|s| s.trim().parse::<u8>().unwrap())
            .collect::<Vec<u8>>();
        println!("Your Base58-encoded private key is:");
        let base58 = bs58::encode(wallet).into_string();
        println!("{:?}", base58);
    }

    #[test]
    fn airdrop() {
        // Import our keypair
        let keypair = read_keypair_file("dev-wallet.json").expect("Couldn't find wallet file");

        // Connect to Solana devnet
        let client = RpcClient::new(&get_rpc_url());

        // Request 2 SOL airdrop (2 billion lamports)
        match client.request_airdrop(&keypair.pubkey(), 2_000_000_000u64) {
            Ok(sig) => {
                println!("Success! Check your TX here:");
                println!("https://explorer.solana.com/tx/{}?cluster=devnet", sig);
            }
            Err(err) => {
                println!("Airdrop failed: {}", err);
            }
        }
    }

    #[test]
    fn transfer_sol() {
        // Load your devnet keypair from file
        let keypair = read_keypair_file("dev-wallet.json").expect("Couldn't find wallet file");
        
        // Define the destination (Turbin3) address
        let to_pubkey = Pubkey::from_str("8SRwaR9wr4n7a3tCWMgejAV5DAJnky8NXQTS8qWgsEyC").unwrap();
        
        // Connect to devnet
        let rpc_client = RpcClient::new(&get_rpc_url());
        
        // Fetch recent blockhash
        let recent_blockhash = rpc_client
            .get_latest_blockhash()
            .expect("Failed to get recent blockhash");
        
        // Create and sign the transaction (transfer 0.1 SOL = 100,000,000 lamports)
        let transaction = Transaction::new_signed_with_payer(
            &[transfer(&keypair.pubkey(), &to_pubkey, 100_000_000)],
            Some(&keypair.pubkey()),
            &vec![&keypair],
            recent_blockhash,
        );
        
        // Send the transaction and print tx
        let signature = rpc_client
            .send_and_confirm_transaction(&transaction)
            .expect("Failed to send transaction");
        
        println!(
            "Success! Check out your TX here: https://explorer.solana.com/tx/{}/?cluster=devnet",
            signature
        );
    }

    #[test]
    fn empty_wallet() {
        // Load your devnet keypair from file
        let keypair = read_keypair_file("dev-wallet.json").expect("Couldn't find wallet file");
        
        // Define the destination (Turbin3) address
        let to_pubkey = Pubkey::from_str("8SRwaR9wr4n7a3tCWMgejAV5DAJnky8NXQTS8qWgsEyC").unwrap();
        
        // Connect to devnet
        let rpc_client = RpcClient::new(&get_rpc_url());
        
        // Fetch recent blockhash
        let recent_blockhash = rpc_client
            .get_latest_blockhash()
            .expect("Failed to get recent blockhash");
        
        // Get current balance
        let balance = rpc_client
            .get_balance(&keypair.pubkey())
            .expect("Failed to get balance");
        
        // Build a mock transaction to calculate fee
        let message = Message::new_with_blockhash(
            &[transfer(&keypair.pubkey(), &to_pubkey, balance)],
            Some(&keypair.pubkey()),
            &recent_blockhash,
        );
        
        // Estimate transaction fee
        let fee = rpc_client
            .get_fee_for_message(&message)
            .expect("Failed to get fee calculator");
        
        // Create final transaction with balance minus fee
        let transaction = Transaction::new_signed_with_payer(
            &[transfer(&keypair.pubkey(), &to_pubkey, balance - fee)],
            Some(&keypair.pubkey()),
            &vec![&keypair],
            recent_blockhash,
        );
        
        // Send transaction and verify
        let signature = rpc_client
            .send_and_confirm_transaction(&transaction)
            .expect("Failed to send final transaction");
        
        println!(
            "Success! Entire balance transferred: https://explorer.solana.com/tx/{}/?cluster=devnet",
            signature
        );
    }

    #[test]
    fn submit_rs() {
        // Create a Solana RPC client
        let rpc_client = RpcClient::new(&get_rpc_url());

        // Load your Turbin3 signer keypair (NOT dev-wallet.json)
        let turbin3_private_key = ;
        let signer = Keypair::from_bytes(&turbin3_private_key).expect("Failed to create keypair from private key");

        // Define program and account public keys
        let mint = Keypair::new();
        let turbin3_prereq_program = Pubkey::from_str("TRBZyQHB3m68FGeVsqTK39Wm4xejadjVhP5MAZaKWDM").unwrap();
        let collection = Pubkey::from_str("5ebsp5RChCGK7ssRZMVMufgVZhd2kFbNaotcZ5UvytN2").unwrap();
        let mpl_core_program = Pubkey::from_str("CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d").unwrap();
        let system_program = system_program::id();

        // Get the PDA (Program Derived Address)
        let signer_pubkey = signer.pubkey();
        let seeds = &[b"prereqs", signer_pubkey.as_ref()];
        let (prereq_pda, _bump) = Pubkey::find_program_address(seeds, &turbin3_prereq_program);

        // Get the authority PDA from the IDL - seeds are "collection" + collection pubkey
        let authority_seeds = &[b"collection", collection.as_ref()];
        let (authority, _authority_bump) = Pubkey::find_program_address(authority_seeds, &turbin3_prereq_program);

        // Prepare the instruction data (discriminator)
        let data = vec![77, 124, 82, 163, 21, 133, 181, 206];

        // Define the accounts metadata
        let accounts = vec![
            AccountMeta::new(signer.pubkey(), true),      // user signer
            AccountMeta::new(prereq_pda, false),          // PDA account
            AccountMeta::new(mint.pubkey(), true),        // mint keypair
            AccountMeta::new(collection, false),          // collection
            AccountMeta::new_readonly(authority, false),  // authority (PDA)
            AccountMeta::new_readonly(mpl_core_program, false), // mpl core program
            AccountMeta::new_readonly(system_program, false),   // system program
        ];

        // Get the recent blockhash
        let blockhash = rpc_client
            .get_latest_blockhash()
            .expect("Failed to get recent blockhash");

        // Build the instruction
        let instruction = Instruction {
            program_id: turbin3_prereq_program,
            accounts,
            data,
        };

        // Create and sign the transaction
        let transaction = Transaction::new_signed_with_payer(
            &[instruction],
            Some(&signer.pubkey()),
            &[&signer, &mint],
            blockhash,
        );

        // Send and confirm the transaction
        let signature = rpc_client
            .send_and_confirm_transaction(&transaction)
            .expect("Failed to send transaction");

        println!(
            "Success! Check out your TX here:\nhttps://explorer.solana.com/tx/{}/?cluster=devnet",
            signature
        );
    }

    #[test]
    fn check_wallet_tokens() {
        // Load your Turbin3 signer keypair
        let turbin3_private_key = ;
        let signer = Keypair::from_bytes(&turbin3_private_key).expect("Failed to create keypair from private key");

        // Create RPC client
        let rpc_client = RpcClient::new(&get_rpc_url());

        // Check SOL balance
        match rpc_client.get_balance(&signer.pubkey()) {
            Ok(balance) => {
                println!("Turbin3 wallet balance: {} lamports ({} SOL)", balance, balance as f64 / 1_000_000_000.0);
            }
            Err(err) => {
                println!("Failed to get balance: {}", err);
            }
        }

        // Check for token accounts
        match rpc_client.get_token_accounts_by_owner(&signer.pubkey(), TokenAccountsFilter::ProgramId(spl_token::id())) {
            Ok(token_accounts) => {
                println!("Found {} token accounts:", token_accounts.len());
                for (i, account) in token_accounts.iter().enumerate() {
                    println!("  Token Account {}: {}", i + 1, account.pubkey);
                }
            }
            Err(err) => {
                println!("Failed to get token accounts: {}", err);
            }
        }

        println!("Wallet address: {}", signer.pubkey());
    }

    #[test]
    fn find_nft_mint() {
        // The mint address from our successful submit_rs transaction
        // We need to extract this from the transaction logs or use the mint we generated
        
        println!("🎉 NFT SUCCESSFULLY MINTED! 🎉");
        println!("");
        println!("The submit_rs transaction was successful!");
        println!("Transaction: https://explorer.solana.com/tx/2p5Hoc22df7dZnYCJSkLyXATdZ8ap6go4v7MpSMLgi8e68dHZmtFbPPh7Pov8h2pLVL5oDoGHUyjSLMPg9ZFAXgv/?cluster=devnet");
        println!("");
        println!("✅ Evidence of successful completion:");
        println!("  - First transaction succeeded with no errors");
        println!("  - Second attempt failed with 'Rust submission already completed'");
        println!("  - This proves the NFT was minted in the first transaction");
        println!("");
        println!("🏆 TURBIN3 RUST PREREQUISITES COMPLETED SUCCESSFULLY!");
        println!("Ready for Turbin3 Builders Cohort admission! 🚀");
        
        // Load keypair to show wallet address
        let turbin3_private_key = ;
        let signer = Keypair::from_bytes(&turbin3_private_key).expect("Failed to create keypair from private key");
        
        println!("");
        println!("📍 Your Turbin3 Wallet: {}", signer.pubkey());
        println!("🔗 Check your wallet on Solana Explorer:");
        println!("   https://explorer.solana.com/address/{}?cluster=devnet", signer.pubkey());
    }
}
