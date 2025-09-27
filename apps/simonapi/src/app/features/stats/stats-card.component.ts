import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-stats-card',
  standalone: false,
  templateUrl: './stats-card.component.html',
  styleUrls: ['./stats-card.component.scss'],
})
export class StatsCardComponent {
  @Input() title = '';
  @Input() subTitle?: string;
}
