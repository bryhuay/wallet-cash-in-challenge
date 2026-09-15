export interface CashInResponseDto {
    operation_id: string;
    user_id: string;
    status: string;
    amount: number;
    currency: string;
    payment_method: string;
    provider_reference?: string;
}