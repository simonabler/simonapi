import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, FileTextIcon } from 'lucide-angular';
import { DevUtilsService } from './dev-utils.service';

@Component({
  standalone: true,
  selector: 'app-dev-md-card',
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './md-card.component.html',
  styleUrls: ['./md-card.component.scss']
})
export class MdCardComponent {
  private api = inject(DevUtilsService);
  readonly FileTextIcon = FileTextIcon;

  mdLoading = false;
  mdInput = '# Markdown Beispiel\n\n- sicher\n- schnell';
  mdHtml: string | null = null;

  async runMd() {
    if (!this.mdInput.trim()) return;
    this.mdLoading = true;
    try {
      this.mdHtml = await this.api.md2html(this.mdInput);
    } finally { this.mdLoading = false; }
  }
}
