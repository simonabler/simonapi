import { Component } from '@angular/core';


@Component({
  selector: 'app-footer',
  standalone: true,
  template: `
  <footer class="bg-light border-top py-3 mt-4 app-footer">
    <div class="container small text-muted d-flex justify-content-between">
      <span>© {{year}} simonapi</span>
      <span>Built with Angular & Bootstrap</span>
    </div>
  </footer>
`,
})
export class FooterComponent { year = new Date().getFullYear(); }
