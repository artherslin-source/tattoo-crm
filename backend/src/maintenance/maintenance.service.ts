import { Injectable } from '@nestjs/common';

type MaintenanceState = {
  enabled: boolean;
  reason?: string;
  since?: string;
};

@Injectable()
export class MaintenanceService {
  private state: MaintenanceState = { enabled: false };

  enable(reason?: string) {
    this.state = { enabled: true, reason, since: new Date().toISOString() };
  }

  disable() {
    this.state = { enabled: false };
  }

  getState(): MaintenanceState {
    return this.state;
  }
}


