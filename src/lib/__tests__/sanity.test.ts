// Smoke test — proves Vitest, the @/ alias, and the test discovery glob
// are wired up. Replace or supplement with real tests targeting:
//   - src/app/components/TradeAnalyzer/smartParser.ts
//   - src/app/components/TradeAnalyzer/summaryUtils.tsx
//   - src/app/components/InventoryChannel/inventoryUtils.ts
//   - _lib/clearance.ts (server-only; test in isolation, no Supabase client)
//
// File naming convention: co-locate as <ModuleName>.test.ts next to the source,
// or group them in a `__tests__/` directory sibling to the source. Both are
// picked up by the `include` glob in vitest.config.ts.

import { describe, it, expect } from 'vitest';

describe('test infrastructure', () => {
  it('runs assertions in the vitest environment', () => {
    expect(1 + 1).toBe(2);
  });

  it('supports async test bodies', async () => {
    const value = await Promise.resolve('ok');
    expect(value).toBe('ok');
  });
});