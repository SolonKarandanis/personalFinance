export class ImportRowFailureDto {
  row: number;
  error: string;
}

export class ImportResultDto {
  imported: number;
  duplicates: number;
  failed: ImportRowFailureDto[];
}
