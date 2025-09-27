import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FooterComponent } from './layout/footer.component';
import { NavbarComponent } from './layout/navbar.component';
import { CookieBannerComponent } from './shared/cookie-consent/cookie-banner.component';

@Component({
  imports: [RouterOutlet, NavbarComponent, FooterComponent, CookieBannerComponent],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected title = 'simonapi';
}
