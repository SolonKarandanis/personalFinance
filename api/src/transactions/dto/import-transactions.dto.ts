import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

// Row contents are deliberately NOT class-validator-decorated here — a
// @ValidateNested failure on one bad row would 400 the entire request.
// Row-level validation happens by hand in TransactionsService.importTransactions
// so one malformed row doesn't block the rest of the batch.
export class ImportTransactionsDto {
  @IsUUID()
  accountDomainId: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(2000)
  rows: unknown[];
}
