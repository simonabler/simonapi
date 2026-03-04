import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LockApiService } from '../services/lock.api';
import { AccessEvent, AccessLink, CreateAccessLinkDto, LockEntity, LockGroup } from '../models/lock.models';

@Component({
  selector: 'app-admin-lock',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-lock.component.html',
  styleUrls: ['./admin-lock.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLockComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(LockApiService);

  // State
  locks = signal<LockEntity[] | null>(null);
  groups = signal<LockGroup[] | null>(null);
  links = signal<AccessLink[] | null>(null);
  events = signal<AccessEvent[] | null>(null);
  busy = signal<boolean>(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);

  // Forms
  lockForm = this.fb.group({
    id: this.fb.control<string | null>(null),
    name: this.fb.control<string>('', { nonNullable: true, validators: [Validators.required] }),
    providerType: this.fb.control<'WEBHOOK' | 'DB' | 'RABBITMQ'>('WEBHOOK', { nonNullable: true }),
    providerConfig: this.fb.control<string>('{}'),
    active: this.fb.control<boolean>(true, { nonNullable: true }),
  });

  groupForm = this.fb.group({
    id: this.fb.control<string | null>(null),
    name: this.fb.control<string>('', { nonNullable: true, validators: [Validators.required] }),
    description: this.fb.control<string>(''),
    memberIds: this.fb.control<string[]>([], { nonNullable: true }),
  });

  linkForm = this.fb.group({
    note: this.fb.control<string>(''),
    validFrom: this.fb.control<string>('', { nonNullable: true, validators: [Validators.required] }),
    validTo: this.fb.control<string>('', { nonNullable: true, validators: [Validators.required] }),
    allowedLockIds: this.fb.control<string[]>([], { nonNullable: true }),
    allowedGroupIds: this.fb.control<string[]>([], { nonNullable: true }),
    maxUses: this.fb.control<number | null>(null),
    requirePin: this.fb.control<boolean>(false, { nonNullable: true }),
  });

  // UI helpers
  providerTypes: Array<'WEBHOOK' | 'DB' | 'RABBITMQ'> = ['WEBHOOK', 'DB', 'RABBITMQ'];

  ngOnInit(): void {
    this.reloadAll();
  }

  reloadAll() {
    this.error.set(null);
    this.success.set(null);
    this.busy.set(true);
    this.api.getLocks$().subscribe({
      next: (locks) => this.locks.set(locks),
      error: (e) => this.error.set(e.message),
    });
    this.api.getGroups$().subscribe({
      next: (groups) => this.groups.set(groups),
      error: (e) => this.error.set(e.message),
    });
    this.api.getAccessLinks$().subscribe({
      next: (links) => this.links.set(links),
      error: (e) => this.error.set(e.message),
      complete: () => this.busy.set(false),
    });
  }

  // Locks
  editLock(lock?: LockEntity) {
    this.error.set(null);
    this.success.set(null);
    if (lock) {
      this.lockForm.patchValue({
        id: lock.id,
        name: lock.name,
        providerType: lock.providerType as any,
        providerConfig: JSON.stringify(lock.providerConfig ?? {}, null, 2),
        active: !!lock.active,
      });
    } else {
      this.lockForm.reset({ id: null, name: '', providerType: 'WEBHOOK', providerConfig: '{}', active: true });
    }
  }

  async saveLock() {
    const v = this.lockForm.getRawValue();
    let cfg: any = {};
    try {
      cfg = v.providerConfig ? JSON.parse(v.providerConfig) : {};
    } catch (e: any) {
      this.error.set('ProviderConfig is not valid JSON.');
      return;
    }
    this.busy.set(true);
    const body: Partial<LockEntity> = { name: v.name!, providerType: v.providerType!, providerConfig: cfg, active: !!v.active };
    const done = () => (this.busy.set(false), this.reloadAll(), this.success.set('Saved'));
    if (v.id) this.api.updateLock$(v.id, body).subscribe({ next: done, error: (e) => (this.error.set(e.message), this.busy.set(false)) });
    else this.api.createLock$(body).subscribe({ next: done, error: (e) => (this.error.set(e.message), this.busy.set(false)) });
  }

  toggleActive(lock: LockEntity) {
    this.busy.set(true);
    this.api.updateLock$(lock.id, { active: !lock.active }).subscribe({
      next: () => {
        this.success.set('Updated');
        this.reloadAll();
      },
      error: (e) => (this.error.set(e.message), this.busy.set(false)),
    });
  }

  // Groups
  editGroup(group?: LockGroup) {
    this.error.set(null);
    this.success.set(null);
    if (group) {
      this.groupForm.patchValue({ id: group.id, name: group.name, description: group.description ?? '', memberIds: group.members?.map((m) => m.lockId) ?? [] });
    } else {
      this.groupForm.reset({ id: null, name: '', description: '', memberIds: [] });
    }
  }
  saveGroup() {
    const v = this.groupForm.getRawValue();
    const body: Partial<LockGroup> = { name: v.name!, description: v.description ?? undefined };
    this.busy.set(true);
    const next = (g: LockGroup) => {
      const memberIds = v.memberIds ?? [];
      if (memberIds.length) {
        this.api
          .addGroupMembers$(g.id, memberIds)
          .subscribe({ next: () => (this.success.set('Gruppe gespeichert'), this.reloadAll()), error: (e) => (this.error.set(e.message), this.busy.set(false)) });
      } else {
        this.success.set('Gruppe gespeichert');
        this.reloadAll();
      }
    };
    if (v.id) this.api.updateGroup$(v.id, body).subscribe({ next, error: (e) => (this.error.set(e.message), this.busy.set(false)) });
    else this.api.createGroup$(body).subscribe({ next, error: (e) => (this.error.set(e.message), this.busy.set(false)) });
  }

  // Access Links
  createdShareUrl = signal<string | null>(null);
  createdPin = signal<string | null>(null);

  createAccessLink() {
    // Convert to DTO
    const v = this.linkForm.getRawValue();
    const dto: CreateAccessLinkDto = {
      note: v.note ?? undefined,
      validFrom: v.validFrom!,
      validTo: v.validTo!,
      allowedLockIds: v.allowedLockIds ?? [],
      allowedGroupIds: v.allowedGroupIds ?? [],
      maxUses: v.maxUses ?? undefined,
      requirePin: v.requirePin ?? false,
    };
    this.busy.set(true);
    this.api.createAccessLink$(dto).subscribe({
      next: (res) => {
        this.createdShareUrl.set(res.shareUrl);
        this.createdPin.set(res.pin ?? null);
        this.success.set('Access-Link erstellt');
        this.reloadAll();
      },
      error: (e) => (this.error.set(e.message), this.busy.set(false)),
    });
  }

  patchAccessLink(link: AccessLink, patch: Partial<AccessLink>) {
    this.busy.set(true);
    this.api.updateAccessLink$(link.id, patch).subscribe({ next: () => (this.success.set('Link aktualisiert'), this.reloadAll()), error: (e) => (this.error.set(e.message), this.busy.set(false)) });
  }

  // Events
  loadEvents(filter: { from?: string; to?: string; lockId?: string; linkId?: string; result?: 'SUCCESS' | 'FAILED' }) {
    this.busy.set(true);
    this.api.getEvents$(filter).subscribe({ next: (ev) => (this.events.set(ev), this.busy.set(false)), error: (e) => (this.error.set(e.message), this.busy.set(false)) });
  }
}

