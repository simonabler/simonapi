import { Inject, Injectable } from '@nestjs/common';
import { ConfirmChannel, Connection } from 'amqplib';
import { LockEntity, LockProvider, LockProviderType, OpenResult } from '../core/lock.types';

@Injectable()
export class RabbitMqProvider implements LockProvider {
  readonly type = LockProviderType.RABBITMQ;
  private cfg!: { exchange: string; routingKey: string; persistent?: boolean; };
  private channel?: ConfirmChannel;

  constructor(@Inject('AMQP_CONNECTION') private readonly amqpConn: Connection) {}

  configure(config: Record<string, any>) {
    this.cfg = { exchange: config.exchange, routingKey: config.routingKey, persistent: config.persistent ?? true };
  }

  private async getChannel(): Promise<ConfirmChannel> {
    if (!this.channel) {
      this.channel = await this.amqpConn.createConfirmChannel();
      await this.channel.assertExchange(this.cfg.exchange, 'topic', { durable: true });
    }
    return this.channel;
  }

  async openLock(lock: LockEntity, opts: { traceId: string }): Promise<OpenResult> {
    try {
      const ch = await this.getChannel();
      const payload = Buffer.from(JSON.stringify({ lockId: lock.id, action: 'OPEN', traceId: opts.traceId, ts: Date.now() }));
      await new Promise<void>((resolve, reject) => {
        ch.publish(this.cfg.exchange, this.cfg.routingKey, payload, { persistent: this.cfg.persistent }, (err) =>
          err ? reject(err) : resolve(),
        );
      });
      return { ok: true };
    } catch (e: any) {
      return { ok: false, detail: e?.message };
    }
  }
}
