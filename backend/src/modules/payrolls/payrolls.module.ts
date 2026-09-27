import { Module } from '@nestjs/common';
import { PayrollsService } from './payrolls.service.js';
import { PayrollsController } from './payrolls.controller.js';

@Module({
  controllers: [PayrollsController],
  providers: [PayrollsService],
})
export class PayrollsModule {}
