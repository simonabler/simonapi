import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, HashIcon } from 'lucide-angular';
import { DevUtilsService } from './dev-utils.service';

@Component({
  standalone: true,
  selector: 'app-dev-hash-card',
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './hash-card.component.html',
  styleUrls: ['./hash-card.component.scss']
})
export class HashCardComponent {
  private api = inject(DevUtilsService);
  readonly HashIcon = HashIcon;

  hashLoading = false;
  hashAlgo: 'md5' | 'sha256' | 'bcrypt' = 'sha256';
  hashInput = '';
  hashResult = '';

  async runHash() {
    if (!this.hashInput.trim()) return;
    this.hashLoading = true;
    try {
      const res = await this.api.hash(this.hashInput, this.hashAlgo);
      this.hashResult = typeof res === 'string' ? res : JSON.stringify(res);
    } finally { this.hashLoading = false; }
  }

  async copy(text: string) {
    try { await navigator.clipboard.writeText(text); } catch {}
  }
}
