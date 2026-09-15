import { Global, Module } from '@nestjs/common';
import * as dotenv from 'dotenv';
import { loadEnv } from './env';
import { APP_CONFIG } from './tokens';

@Global()
@Module({
  providers: [
    {
      provide: APP_CONFIG,
      useFactory: () => {
        dotenv.config(); 
        return loadEnv(process.env);
      },
    },
  ],
  exports: [APP_CONFIG],
})
export class AppConfigModule {}