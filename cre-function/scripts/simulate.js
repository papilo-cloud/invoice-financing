import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Simulate the verification function locally
 * This helps test the logic before deploying to Chainlink
 */

// Mock Functions object (simulates Chainlink runtime)
globalThis.Functions = {
  encodeUint256: (value) => {
    const buffer = new Uint8Array(32);
    const hex = BigInt(value).toString(16).padStart(64, '0');
    for (let i = 0; i < 32; i++) {
      buffer[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return buffer;
  },
  
  // Mock HTTP request for simulation
  makeHttpRequest: async (config) => {
    console.log('Mock API call to:', config.url);
    
    // Simulate CoinGecko response
    if (config.url.includes('coingecko')) {
      return {
        data: {
          ethereum: {
            usd: 1857.50,
            usd_24h_change: 3.45,
            usd_market_cap: 342500000000
          }
        }
      };
    }
    
    return { error: 'Unknown API' };
  }
};

// Test cases
const testCases = [
  {
    name: 'Trusted Company - Apple Inc (Bull Market)',
    args: [
      '0', // invoiceId
      'Apple Inc', // debtorName
      '50000000000000000000000', // 50000 ETH
      String(Math.floor(Date.now() / 1000) + 60 * 86400), // 60 days from now
    ],
    expectedRange: [85, 100],
  },
  {
    name: 'Unknown Company - Good Terms',
    args: [
      '1',
      'Random Corp Ltd',
      '5000000000000000000000', // 5000 ETH
      String(Math.floor(Date.now() / 1000) + 45 * 86400), // 45 days
    ],
    expectedRange: [60, 80],
  },
  {
    name: 'Overdue Invoice',
    args: [
      '2',
      'Late Payer Inc',
      '10000000000000000000000', // 10000 ETH
      String(Math.floor(Date.now() / 1000) - 10 * 86400), // 10 days ago
    ],
    expectedRange: [0, 30],
  },
  {
    name: 'Microsoft - Optimal Timeframe',
    args: [
      '3',
      'Microsoft Corporation',
      '75000000000000000000000', // 75000 ETH
      String(Math.floor(Date.now() / 1000) + 45 * 86400), // 45 days
    ],
    expectedRange: [85, 100],
  },
];

async function simulate() {
  console.log('Simulating Invoice Verification Locally\n');

  const sourcePath = path.resolve(__dirname, '../src/invoiceVerification.js');
  const sourceCode = readFileSync(sourcePath, 'utf8');

  // Run each test case
  for (const testCase of testCases) {
    console.log('═══════════════════════════════════════════');
    console.log('Test Case:', testCase.name);
    console.log('═══════════════════════════════════════════');

    const AsyncFunction = async function() {}.constructor;
    const func = new AsyncFunction('args', sourceCode);

    try {
      const result = await func(testCase.args);
      
      let success = false;
      let score = 0;

      if (result instanceof Uint8Array) {
        // First 32 bytes = bool
        success = result[31] === 1;
        
        // Next 32 bytes = uint256 (risk score)
        for (let i = 32; i < 64; i++) {
          score = score * 256 + result[i];
        }
      }

      console.log('\n Result:');
      console.log('  - Success:', success);
      console.log('  - Risk Score:', score, '/ 100');
      
      const [min, max] = testCase.expectedRange;
      if (success && score >= min && score <= max) {
        console.log('PASS - Score in expected range', `[${min}-${max}]`);
      } else if (!success) {
        console.log('FAIL - Verification failed when success was expected');
      } else {
        console.log('WARNING - Score outside expected range', `[${min}-${max}]`);
      }
      
    } catch (error) {
      console.error(' Error:', error.message);
      console.error(error.stack);
    }

    console.log('');
  }

  console.log('═══════════════════════════════════════════');
  console.log('Simulation Complete');
  console.log('═══════════════════════════════════════════\n');
}

simulate();