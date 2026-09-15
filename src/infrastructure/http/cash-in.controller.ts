import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ProcessCashInUseCase } from '@application/use-cases/process-cash-in.use-case';
import { CashInBodyDto } from './dto/cash-in-body.dto';
import { CashInHeadersDto } from './dto/cash-in-headers.dto';
import { CashInResponseDto } from './dto/cash-in-response.dto';

@Controller('cash-in')
export class CashInController {
  constructor(private readonly processCashIn: ProcessCashInUseCase) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async cashIn(
    @Headers() headers: CashInHeadersDto,
    @Body() body: CashInBodyDto,
  ): Promise<CashInResponseDto> {
    const idempotencyKey = headers['x-idempotency-key'];

    const result = await this.processCashIn.execute({
      idempotencyKey,
      userId: body.user_id,
      amount: body.amount,
      currency: body.currency,
      paymentMethod: body.payment_method,
    });

    return {
      operation_id: result.operationId,
      user_id: result.userId,
      status: result.status,
      amount: result.amount,
      currency: result.currency,
      payment_method: result.paymentMethod,
      provider_reference: result.providerReference ?? undefined,
    };
  }
}