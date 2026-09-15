export interface PaymentWebhookResponseDto {
    operation_id: string;
    status: string;
    credited: boolean;
}