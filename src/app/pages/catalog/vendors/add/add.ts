import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ApiCallsService } from '../../../../services/apicalls.service';

const SCHEMA = 'catalog';

export type VendorStatus = 'active' | 'inactive';

export interface Option<T = string> {
  value: T;
  label: string;
}

export const VENDOR_STATUSES: Option<VendorStatus>[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

/** Row shape of catalog.vendor */
export interface VendorRow {
  id: string;
  name: string;
  contact: string | null;
  phone: number | null;
  email: string | null;
  status: VendorStatus | null;
  notes: string | null;
  created_on: string;
}

@Component({
  selector: 'app-add-vendor',
  imports: [ReactiveFormsModule],
  templateUrl: './add.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class AddVendor {
  private fb = inject(NonNullableFormBuilder);
  private api = inject(ApiCallsService);

  readonly statuses = VENDOR_STATUSES;
  /** When true (e.g. inside a popup), hides the page title row — the host supplies its own header. */
  readonly embedded = input(false);
  /** Emits the newly created vendor row after a successful save. */
  readonly saved = output<VendorRow>();

  saving = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);

  form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    contact: ['', Validators.maxLength(120)],
    phone: ['', Validators.pattern(/^[\d\s()+.-]{7,20}$/)],
    email: ['', Validators.email],
    status: this.fb.control<VendorStatus>('active'),
    notes: [''],
  });

  get f() {
    return this.form.controls;
  }

  invalid(name: keyof typeof this.form.controls) {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  setStatus(status: VendorStatus) {
    this.f.status.setValue(status);
    this.f.status.markAsDirty();
  }

  onDiscard() {
    this.form.reset();
    this.error.set(null);
    this.success.set(null);
  }

  async onSubmit() {
    this.error.set(null);
    this.success.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.form.disable();

    try {
      const vendor = await this.insertVendor();
      this.success.set(`"${vendor.name}" saved.`);
      this.form.reset();
      this.saved.emit(vendor);
    } catch (err) {
      this.error.set(this.describeError(err));
    } finally {
      this.saving.set(false);
      this.form.enable();
    }
  }

  private async insertVendor(): Promise<VendorRow> {
    const v = this.form.getRawValue();
    const text = (s: string) => (s.trim() === '' ? null : s.trim());
    const digits = v.phone.replace(/\D/g, '');
    const row = {
      name: v.name.trim(),
      contact: text(v.contact),
      phone: digits ? Number(digits) : null,
      email: text(v.email),
      status: v.status,
      notes: text(v.notes),
    };
    const [vendor] = await firstValueFrom(
      this.api.apiCall('rest/v1/vendor', 'POST', row, true, {
        schema: SCHEMA,
        headers: { Prefer: 'return=representation' },
      }),
    );
    return vendor as VendorRow;
  }

  private describeError(err: unknown): string {
    const e = err as { error?: { code?: string; message?: string }; message?: string; status?: number };
    if (e?.status === 401 || e?.status === 403) return 'You are not authorized to add vendors. Please sign in again.';
    if (e?.error?.code === '23505') return 'A vendor with that name already exists.';
    return e?.error?.message ?? e?.message ?? 'Something went wrong while saving the vendor.';
  }
}
