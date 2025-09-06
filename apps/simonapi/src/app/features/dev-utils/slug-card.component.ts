import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, TypeIcon } from 'lucide-angular';
import { DevUtilsService } from './dev-utils.service';

@Component({
  standalone: true,
  selector: 'app-dev-slug-card',
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './slug-card.component.html',
  styleUrls: ['./slug-card.component.scss']
})
export class SlugCardComponent {
  private api = inject(DevUtilsService);
  readonly TypeIcon = TypeIcon;

  slugLoading = false;
  slugInput = '';
  slugResult = '';

  async runSlug() {
    if (!this.slugInput.trim()) return;
    this.slugLoading = true;
    try {
      const res = await this.api.slugify(this.slugInput);
      this.slugResult = typeof res === 'string' ? res : JSON.stringify(res);
    } finally { this.slugLoading = false; }
  }

  async copy(text: string) {
    try { await navigator.clipboard.writeText(text); } catch {}
  }
}
