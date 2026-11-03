import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AdminPermission, AdminUser } from '../../../../core/models/admin.models';
import { AdminService } from '../../../../core/services/admin.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.scss'
})
export class UserListComponent implements OnInit {
  private readonly admin = inject(AdminService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  readonly users = signal<AdminUser[]>([]);
  readonly permissions = signal<AdminPermission[]>([]);
  readonly selectedPermissions = signal<Set<string>>(new Set());
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly editorOpen = signal(false);
  readonly editing = signal<AdminUser | null>(null);
  readonly form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.maxLength(256)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(256)]],
    password: ['', [Validators.minLength(8), Validators.maxLength(128)]],
    isActive: [true]
  });

  ngOnInit(): void { this.load(); }
  load(): void {
    this.loading.set(true);
    forkJoin({ users: this.admin.users(), permissions: this.admin.permissions() }).subscribe({
      next: result => { this.users.set(result.users); this.permissions.set(result.permissions); this.loading.set(false); },
      error: () => { this.loading.set(false); this.toast.error('Could not load admin accounts.'); }
    });
  }
  openCreate(): void {
    this.editing.set(null);
    this.form.reset({ fullName: '', email: '', password: '', isActive: true });
    this.selectedPermissions.set(new Set());
    this.editorOpen.set(true);
  }
  openEdit(user: AdminUser): void {
    if (user.role === 'SuperAdmin') return;
    this.editing.set(user);
    this.form.reset({ fullName: user.fullName, email: user.email, password: '', isActive: user.isActive });
    this.selectedPermissions.set(new Set(user.permissions));
    this.editorOpen.set(true);
  }
  closeEditor(): void { if (!this.saving()) this.editorOpen.set(false); }
  togglePermission(key: string): void {
    this.selectedPermissions.update(current => {
      const next = new Set(current); next.has(key) ? next.delete(key) : next.add(key); return next;
    });
  }
  selectAll(): void { this.selectedPermissions.set(new Set(this.permissions().map(x => x.key))); }
  clearAll(): void { this.selectedPermissions.set(new Set()); }
  permissionName(key: string): string { return this.permissions().find(x => x.key === key)?.name ?? key; }
  save(): void {
    const editing = this.editing();
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    if (!editing && !this.form.controls.password.value) { this.form.controls.password.setErrors({ required: true }); return; }
    if (this.selectedPermissions().size === 0) { this.toast.warning('Select at least one operation for this account.'); return; }
    const value = this.form.getRawValue();
    const request = { fullName: value.fullName.trim(), email: value.email.trim(), password: value.password || undefined,
      isActive: value.isActive, permissions: [...this.selectedPermissions()] };
    this.saving.set(true);
    const operation = editing ? this.admin.updateUser(editing.id, request) : this.admin.createUser(request);
    operation.subscribe({
      next: saved => {
        this.users.update(users => editing ? users.map(user => user.id === saved.id ? saved : user)
          : [...users, saved].sort((a, b) => a.fullName.localeCompare(b.fullName)));
        this.saving.set(false); this.editorOpen.set(false);
        this.toast.success(editing ? 'Admin account updated.' : 'Admin account created.');
      },
      error: error => { this.saving.set(false); this.toast.error(error?.error?.message ?? error?.error?.errors?.[0] ?? 'Could not save the account.'); }
    });
  }
}
