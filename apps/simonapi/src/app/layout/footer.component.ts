import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  template: `
  <footer class="bg-light border-top py-3 mt-4 app-footer">
    <div class="container small text-muted d-flex flex-column flex-md-row justify-content-between gap-2">
      <span>&copy; {{year}} SimonAPI</span>
      <span>
        Built with Angular &amp; Bootstrap &middot;
        <a class="text-muted" href="/impressum">Impressum</a>
      </span>
    </div>
  </footer>
`,
})
export class FooterComponent { year = new Date().getFullYear(); }
