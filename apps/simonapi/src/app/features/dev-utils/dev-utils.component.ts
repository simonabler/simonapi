import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EchoCardComponent } from './echo-card.component';
import { IdCardComponent } from './id-card.component';
import { SlugCardComponent } from './slug-card.component';
import { HashCardComponent } from './hash-card.component';
import { MdCardComponent } from './md-card.component';

@Component({
  selector: 'app-dev-utils',
  standalone: true,
  imports: [CommonModule, EchoCardComponent, IdCardComponent, SlugCardComponent, HashCardComponent, MdCardComponent],
  templateUrl: './dev-utils.component.html',
  styleUrls: ['./dev-utils.component.scss']
})
export class DevUtilsComponent {
  // Container-only; logic moved into child cards
}
