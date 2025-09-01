import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { HammerIcon, LucideAngularModule } from 'lucide-angular';


@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './navbar.component.html',

})
export class NavbarComponent {
  readonly HammerIcon = HammerIcon;


}
