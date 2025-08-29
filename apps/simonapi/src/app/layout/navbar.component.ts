import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { HammerIcon, LucideAngularModule } from 'lucide-angular';


@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive,LucideAngularModule],
  template: `
<nav class="navbar navbar-expand-lg border-bottom sticky-top bg-body" style="backdrop-filter:blur(8px)">
<div class="container">
<a class="navbar-brand d-flex align-items-center gap-2" href="#">
<span class="d-inline-grid place-items-center rounded-3 text-white" style="width:32px;height:32px;background:linear-gradient(135deg,#0ea5e9,#10b981)"><lucide-icon [size]="20" [img]="HammerIcon"></lucide-icon></span>
<strong>API Hub</strong>
<span class="badge text-bg-secondary ms-2">Preview</span>
</a>
<button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#nav"><span class="navbar-toggler-icon"></span></button>
<div id="nav" class="collapse navbar-collapse">
<ul class="navbar-nav me-auto mb-2 mb-lg-0">
<li class="nav-item"><a class="nav-link" href="#apis">APIs</a></li>
<li class="nav-item"><a class="nav-link" href="#apps">Apps</a></li>
<li class="nav-item"><a class="nav-link" href="#docs">Dokumentation</a></li>
<li class="nav-item"><a class="nav-link" href="#openapi">OpenAPI</a></li>
<li class="nav-item"><a class="nav-link" href="#console">Console</a></li>
<li class="nav-item"><a class="nav-link" href="#profile">Profil</a></li>
</ul>
<div class="d-flex align-items-center gap-2">
</div>
</div>
</div>
</nav>
`,
})
export class NavbarComponent {
  readonly HammerIcon = HammerIcon;


}
