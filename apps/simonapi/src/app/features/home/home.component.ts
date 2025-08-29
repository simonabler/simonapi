import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';


@Component({
  standalone: true,
  selector: 'app-home',
  imports: [RouterLink],
  template: `
<div class="row g-4">
  <div class="col-12 col-lg-8">
    <div class="card shadow-sm">
      <div class="card-body">
        <h1 class="h3 mb-3">Willkommen bei simonapi</h1>
        <p class="text-muted">Frontend zum Erkunden und Testen deiner NestJS-APIs im Nx-Workspace.</p>
        <a class="btn btn-primary me-2" routerLink="/apis">APIs ansehen</a>
        <a class="btn btn-outline-secondary" routerLink="/tester">API testen</a>
      </div>
    </div>
  </div>
  <div class="col-12 col-lg-4">
    <div class="card border-0 bg-dark text-white shadow-sm">
      <div class="card-body">
        <h2 class="h5">Schnellstart</h2>
        <ol class="mb-0 small">
          <li>Backend (Nest) starten auf <code>http://localhost:3000</code></li>
          <li>Frontend mit Proxy aufrufen: <code>nx serve simonapi</code></li>
          <li>APIs unter <code>/api/*</code> testen</li>
        </ol>
      </div>
    </div>
  </div>
</div>
`,
})
export class HomeComponent {}
