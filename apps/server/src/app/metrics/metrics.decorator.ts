import { SetMetadata } from '@nestjs/common';
export const SKIP_METRICS = 'skip_metrics';
export const SkipMetrics = () => SetMetadata(SKIP_METRICS, true);
