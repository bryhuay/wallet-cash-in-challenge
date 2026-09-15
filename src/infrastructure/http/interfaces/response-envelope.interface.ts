export interface ResponseEnvelope<T> {
    success: boolean;
    statusCode: number;
    data: T;
}