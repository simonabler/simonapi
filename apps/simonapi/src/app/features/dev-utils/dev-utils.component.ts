import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DevUtilsService } from './dev-utils.service';

@Component({
  selector: 'app-dev-utils',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dev-utils.component.html',
  styleUrls: ['./dev-utils.component.scss']
})
export class DevUtilsComponent {
  private api = inject(DevUtilsService);

  // Echo
  echoLoading = false;
  echoResult: any = null;

  // ID
  idLoading = false;
  idType: 'uuid' | 'ulid' = 'ulid';
  idResult: any = '';

  // Slugify
  slugLoading = false;
  slugInput = '';
  slugResult = '';

  // Hash
  hashLoading = false;
  hashAlgo: 'md5' | 'sha256' | 'bcrypt' = 'sha256';
  hashInput = '';
  hashResult = '';

  // Markdown
  mdLoading = false;
  mdInput = '# Markdown Beispiel\n\n- sicher\n- schnell';
  mdHtml: string | null = null;

  async runEcho() {
    this.echoLoading = true;
    try {
      this.echoResult = await this.api.echo();
    } finally { this.echoLoading = false; }
  }

  async runId() {
    this.idLoading = true;
    try {
      this.idResult = await this.api.generateId(this.idType);
    } finally { this.idLoading = false; }
  }

  async runSlug() {
    if (!this.slugInput.trim()) return;
    this.slugLoading = true;
    try {
      const res = await this.api.slugify(this.slugInput);
      this.slugResult = typeof res === 'string' ? res : JSON.stringify(res);
    } finally { this.slugLoading = false; }
  }

  async runHash() {
    if (!this.hashInput.trim()) return;
    this.hashLoading = true;
    try {
      const res = await this.api.hash(this.hashInput, this.hashAlgo);
      this.hashResult = typeof res === 'string' ? res : JSON.stringify(res);
    } finally { this.hashLoading = false; }
  }

  async runMd() {
    if (!this.mdInput.trim()) return;
    this.mdLoading = true;
    try {
      this.mdHtml = await this.api.md2html(this.mdInput);
    } finally { this.mdLoading = false; }
  }

  async copy(text: string) {
    try { await navigator.clipboard.writeText(text); } catch {}
  }
}

