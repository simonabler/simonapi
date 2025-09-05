import { WatermarkService } from './watermark.service';
import * as Sharp from 'sharp';
import { ApplyWatermarkDto } from './dto/apply-watermark.dto';

describe('WatermarkService', () => {
  const service = new WatermarkService();

  async function makeTestImage(w = 400, h = 300, color = { r: 200, g: 220, b: 240 }) {
    return await Sharp.default({ create: { width: w, height: h, channels: 3, background: color } }).png().toBuffer();
  }

  it('should watermark with text', async () => {
    const input = await makeTestImage();
    const dto: ApplyWatermarkDto = {
      mode: 'text' as any,
      text: 'Test',
      opacity: 0.5,
      position: 'bottom-right' as any,
      fontSize: 32,
      margin: 10,
    } as any;

    const { output, outMime } = await service.applyWatermark({ inputBuffer: input, inputMime: 'image/png', dto });
    expect(output.length).toBeGreaterThan(1000);
    expect(outMime).toBe('image/png');
    const meta = await Sharp.default(output).metadata();
    expect(meta.width).toBe(400);
    expect(meta.height).toBe(300);
  });

  it('should watermark with logo (single)', async () => {
    const input = await makeTestImage();
    // generate a small logo programmatically
    const logo = await Sharp.default({ create: { width: 120, height: 60, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .png().composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="60"><rect x="0" y="0" width="120" height="60" rx="8" ry="8" fill="white"/></svg>`), top: 0, left: 0 }])
      .png().toBuffer();

    const dto: ApplyWatermarkDto = {
      mode: 'logo' as any,
      opacity: 0.6,
      position: 'center' as any,
      scale: 0.3,
      margin: 0,
    } as any;

    const { output, outMime } = await service.applyWatermark({ inputBuffer: input, inputMime: 'image/png', dto, logoBuffer: logo });
    expect(output.length).toBeGreaterThan(1000);
    expect(outMime).toBe('image/png');
  });
});

