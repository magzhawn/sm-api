import { Injectable } from '@nestjs/common';

export interface Plan {
  id: string;
  name: string;
  price: number;
  description: string;
}

@Injectable()
export class PlansService {
  private plans: Plan[] = [
    { id: 'basic', name: 'Basic', price: 500, description: 'Basic plan' },
    { id: 'standard', name: 'Standard', price: 1000, description: 'Standard plan' },
    { id: 'premium', name: 'Premium', price: 2000, description: 'Premium plan' },
  ];

  findAll(): Plan[] {
    return this.plans;
  }

  findById(id: string): Plan | undefined {
    return this.plans.find(p => p.id === id);
  }
}
