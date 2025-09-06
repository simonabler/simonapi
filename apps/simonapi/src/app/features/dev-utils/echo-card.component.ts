import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, TerminalIcon } from 'lucide-angular';
import { DevUtilsService } from './dev-utils.service';

@Component({
  standalone: true,
  selector: 'app-dev-echo-card',
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './echo-card.component.html',
  styleUrls: ['./echo-card.component.scss']
})
export class EchoCardComponent {
  private api = inject(DevUtilsService);
  readonly TerminalIcon = TerminalIcon;

  echoLoading = false;
  echoResult: any = null;

  async runEcho() {
    this.echoLoading = true;
    try {
      this.echoResult = await this.api.echo();
    } finally { this.echoLoading = false; }
  }
}
