import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, PlusIcon } from 'lucide-angular';
import { BarcodeEditorItemComponent } from './barcode-editor-item.component';

type Item = { id: number };

@Component({
  standalone: true,
  imports: [CommonModule, LucideAngularModule, BarcodeEditorItemComponent],
  selector: 'app-barcode-editor',
  templateUrl: './barcode-editor.component.html',
  styleUrls: ['./barcode-editor.component.scss']
})
export class BarcodeEditorComponent {
  readonly PlusIcon = PlusIcon;

  items: Item[] = [{ id: Date.now() }];

  add() {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    this.items = [...this.items, { id }];
  }

  remove(id: number) {
    this.items = this.items.filter(x => x.id !== id);
    if (this.items.length === 0) this.add();
  }

  trackById(_i: number, it: Item) { return it.id; }
}

