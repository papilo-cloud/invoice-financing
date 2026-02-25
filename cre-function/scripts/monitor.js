import { createPublicClient, http, parseAbiItem } from 'viem';
import { sepolia } from 'viem/chains';
import { config } from '../config.js';

async function monitor() {
  console.log('Monitoring Chainlink Verification Events...\n');

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(config.rpcUrl),
  });

  // Watch for VerificationRequested events
  const unwatch1 = publicClient.watchEvent({
    address: config.verifierAddress,
    event: parseAbiItem('event VerificationRequested(bytes32 indexed requestId, uint256 indexed invoiceId)'),
    onLogs: (logs) => {
      logs.forEach((log) => {
        console.log('  Verification Requested:');
        console.log('  Request ID:', log.args.requestId);
        console.log('  Invoice ID:', log.args.invoiceId?.toString());
        console.log('  Block:', log.blockNumber?.toString());
        console.log('');
      });
    },
  });

  // Watch for VerificationFulfilled events
  const unwatch2 = publicClient.watchEvent({
    address: config.verifierAddress,
    event: parseAbiItem('event VerificationFulfilled(uint256 indexed invoiceId, uint256 riskScore, bool success)'),
    onLogs: (logs) => {
      logs.forEach((log) => {
        console.log('  Verification Fulfilled:');
        console.log('  Invoice ID:', log.args.invoiceId?.toString());
        console.log('  Risk Score:', log.args.riskScore?.toString());
        console.log('  Success:', log.args.success);
        console.log('  Block:', log.blockNumber?.toString());
        console.log('');
      });
    },
  });

  console.log('Watching for events... (Press Ctrl+C to stop)\n');
}

monitor();