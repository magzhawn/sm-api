import { Controller, Get } from '@nestjs/common';
import { PlansService, Plan } from './plans.service';

@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  getPlans(): Plan[] {
    return this.plansService.findAll();
  }
}
