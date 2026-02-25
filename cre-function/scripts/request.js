import { createPublicClient, createWalletClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { config } from '../src/config.js';

const VERIFIER_ABI = [
  {
    inputs: [{ internalType: 'uint256', name: 'invoiceId', type: 'uint256' }],
    name: 'requestVerification',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'invoiceId', type: 'uint256' },
      { internalType: 'uint256', name: 'riskScore', type: 'uint256' },
    ],
    name: 'manualVerify',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'invoiceId', type: 'uint256' },
      { indexed: false, name: 'riskScore', type: 'uint256' },
      { indexed: false, name: 'success', type: 'bool' },
    ],
    name: 'VerificationFulfilled',
    type: 'event',
  },
];

async function request() {
  console.log('Requesting Invoice Verification\n');

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

  const invoiceId = process.argv[2] || '0';
  const useManual = process.argv[3] === '--manual';

  console.log('Invoice ID:', invoiceId);
  console.log('Method:', useManual ? 'Manual' : 'Chainlink Functions');
  console.log('Account:', account.address);
  console.log('');

  try {
    if (useManual) {
      // Use manual verification (for testing)
      console.log('Using manual verification with risk score 85...');
      
      const hash = await walletClient.writeContract({
        address: config.verifierAddress,
        abi: VERIFIER_ABI,
        functionName: 'manualVerify',
        args: [BigInt(invoiceId), BigInt(85)],
      });

      console.log('Transaction hash:', hash);
      console.log('Waiting for confirmation...');

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
      if (receipt.status === 'success') {
        console.log('Manual verification successful!');
        console.log('Invoice', invoiceId, 'verified with risk score 85');
      }
    } else {
      // Use Chainlink Functions (requires subscription)
      console.log('Requesting Chainlink Functions verification...');
      console.log('This requires a funded Chainlink subscription!\n');
      
      const hash = await walletClient.writeContract({
        address: config.verifierAddress,
        abi: VERIFIER_ABI,
        functionName: 'requestVerification',
        args: [BigInt(invoiceId)],
      });

      console.log('Transaction hash:', hash);
      console.log('Waiting for confirmation...');

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
      if (receipt.status === 'success') {
        console.log('Verification request sent!');
        console.log('Waiting for Chainlink DON response...');
        console.log('(This may take 1-2 minutes)\n');
        console.log('Monitor events on Etherscan or use the Functions dashboard');
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

request();