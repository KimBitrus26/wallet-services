import { Entity, Column, PrimaryColumn, CreateDateColumn } from 'typeorm';

@Entity('idempotency_records')
export class IdempotencyRecord {
  @PrimaryColumn({ type: 'varchar', length: 255 })
  idempotencyKey: string;

  @Column({ type: 'text' })
  response: string;

  @Column({ type: 'int' })
  statusCode: number;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'datetime' })
  expiresAt: Date;
}