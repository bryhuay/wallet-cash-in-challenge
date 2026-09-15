export enum OperationStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export const TERMINAL_OPERATION_STATUSES: ReadonlySet<OperationStatus> =
  new Set([OperationStatus.COMPLETED, OperationStatus.FAILED]);
