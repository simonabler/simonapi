import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { StatsDashboardComponent } from './stats-dashboard.component';
import { StatsCardComponent } from './stats-card.component';
import { SecurityTableComponent } from './security-table.component';
import { StatsRoutingModule } from './stats-routing.module';
import { DurationPipe } from './duration.pipe';
import { IsoDatePipe } from './iso-date.pipe';

@NgModule({
  declarations: [
    StatsDashboardComponent,
    StatsCardComponent,
    SecurityTableComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    HttpClientModule,
    StatsRoutingModule,
    DurationPipe,
    IsoDatePipe,
  ],
  exports: [StatsDashboardComponent],
})
export class StatsModule {}
