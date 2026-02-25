import { createPublicClient, createWalletClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { readFileSync } from 'fs';
import { config } from '../src/config.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VERIFIER_ABI = [
  {
    inputs: [{ internalType: 'string', name: 'source', type: 'string' }],
    name: 'setVerificationSource',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];

async function deploy() {
  console.log('Deploying Invoice Verification Source...\n');

  // Setup wallet
  const account = privateKeyToAccount(config.privateKey);
  
  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http(config.rpcUrl),
  });

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(config.rpcUrl),
  });

  console.log('Deploying from:', account.address);
  console.log('Verifier contract:', config.verifierAddress);

  const projectRoot = path.resolve(__dirname, '..');
  const sourcePath = path.join(projectRoot, 'src', 'invoiceVerification.js');

  try {
      // Read source code
    const sourceCode = readFileSync(sourcePath, 'utf8');
    console.log('Source code length:', sourceCode.length, 'bytes\n');

    // Upload source to contract
    console.log('Uploading source code to contract...');
    
    const hash = await walletClient.writeContract({
      address: config.verifierAddress,
      abi: VERIFIER_ABI,
      functionName: 'setVerificationSource',
      args: [sourceCode],
    });

    console.log('Transaction hash:', hash);
    console.log('Waiting for confirmation...');

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    
    if (receipt.status === 'success') {
      console.log('Source code uploaded successfully!');
      console.log('Block number:', receipt.blockNumber);
      console.log('\nYou can now call:');
      console.log('- manualVerify() for quick testing');
      console.log('- requestVerification() for Chainlink Functions');
    } else {
      console.log('Transaction failed');
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

deploy();