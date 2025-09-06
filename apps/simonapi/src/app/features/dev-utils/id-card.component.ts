import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, FingerprintIcon } from 'lucide-angular';
import { DevUtilsService } from './dev-utils.service';

@Component({
  standalone: true,
  selector: 'app-dev-id-card',
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './id-card.component.html',
  styleUrls: ['./id-card.component.scss']
})
export class IdCardComponent {
  private api = inject(DevUtilsService);
  readonly FingerprintIcon = FingerprintIcon;

  idLoading = false;
  idType: 'uuid' | 'ulid' = 'ulid';
  idResult: any = '';

  async runId() {
    this.idLoading = true;
    try {
      this.idResult = await this.api.generateId(this.idType);
    } finally { this.idLoading = false; }
  }

  async copy(text: string) {
    try { await navigator.clipboard.writeText(text); } catch {}
  }
}
