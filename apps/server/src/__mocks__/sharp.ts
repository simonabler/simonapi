/**
 * Jest manual mock for `sharp`.
 *
 * The real sharp module requires a platform-specific native binary that is
 * not available in every CI/test environment. This mock replaces it with a
 * minimal stub that satisfies the call signatures used by WatermarkService
 * without needing the binary.
 *
 * Activated automatically by Jest when `sharp` is imported from test files
 * inside apps/server/src (Jest looks for __mocks__ next to node_modules or
 * adjacent to the file under test — we use moduleNameMapper to point here).
 */

const sharpChain = () => {
  const chain: any = {
    png:       () => chain,
    jpeg:      () => chain,
    webp:      () => chain,
    resize:    () => chain,
    composite: () => chain,
    metadata:  () => Promise.resolve({ width: 400, height: 300, format: 'png' }),
    toBuffer:  () => Promise.resolve(Buffer.alloc(1024, 0xff)),
    toFile:    () => Promise.resolve({ size: 1024 }),
  };
  return chain;
};

const sharp: any = jest.fn(sharpChain);
sharp.default = jest.fn(sharpChain);
// Named re-exports used by some callers
sharp.fit  = { cover: 'cover', contain: 'contain', fill: 'fill', inside: 'inside', outside: 'outside' };
sharp.gravity = { center: 'center' };

module.exports = sharp;
module.exports.default = sharp;
