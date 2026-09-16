export interface ApiResponse {
  body: {
    data?: {
      operation_id?: string;
      provider_reference?: string;
      providerReference?: string;
      status?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  status: number;
}
