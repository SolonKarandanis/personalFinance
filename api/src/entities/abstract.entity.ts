import { Column, PrimaryGeneratedColumn } from 'typeorm';

export class AbstractEntity<T> {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
      name: 'domain_id',
      type: 'uuid',
      unique: true,
      default: () => 'gen_random_uuid()',
    })
    domainId: string;

  constructor(entity: Partial<T>) {
    Object.assign(this, entity);
  }
}