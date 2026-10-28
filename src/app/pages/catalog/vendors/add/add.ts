import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiCallsService } from '../../../../services/apicalls.service';
import { Option, VendorRow, VendorStatus } from '../../../../models/site';
import { Toast } from '../../../../components/toast/toast';

const SCHEMA = 'catalog';

export const VENDOR_STATUSES: Option<VendorStatus>[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

@Component({
  selector: 'app-add-vendor',
  imports: [ReactiveFormsModule, RouterLink, Toast],
  templateUrl: './add.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class AddVendor implements OnInit {
  private fb = inject(NonNullableFormBuilder);
  private api = inject(ApiCallsService);
  private route = inject(ActivatedRoute);

  readonly statuses = VENDOR_STATUSES;
  /** When true (e.g. inside a popup), hides the page title row — the host supplies its own header. */
  readonly embedded = input(false);
  /** Emits the created/updated vendor row after a successful save. */
  readonly saved = output<VendorRow>();
  /** Emits when Discard is pressed while embedded, so the host can close its popup. */
  readonly cancelled = output<void>();

  /** Set when editing an existing vendor (route `catalog/vendors/edit/:id`). */
  vendorId = signal<string | null>(null);
  isEdit = computed(() => this.vendorId() !== null);
  loadingVendor = signal(false);
  /** Snapshot of the loaded vendor's form values so Discard can revert to them. */
  private loadedValue: ReturnType<AddVendor['form']['getRawValue']> | null = null;

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

  ngOnInit() {
    // The popup embeds this component without a route param, so only read it when standalone
    const id = this.embedded() ? null : this.route.snapshot.paramMap.get('id');
    if (id) {
      this.vendorId.set(id);
      this.loadVendor(id);
    }
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
    this.error.set(null);
    this.success.set(null);
    this.loadedValue ? this.form.reset(this.loadedValue) : this.form.reset();
    if (this.embedded()) this.cancelled.emit();
  }

  private async loadVendor(id: string) {
    this.loadingVendor.set(true);
    this.form.disable();
    try {
      const [v] = (await firstValueFrom(
        this.api.apiCall(`rest/v1/vendor?id=eq.${id}&select=*`, 'GET', null, true, { schema: SCHEMA }),
      )) as VendorRow[];
      if (!v) throw new Error('Vendor not found.');
      this.form.patchValue({
        name: v.name,
        contact: v.contact ?? '',
        phone: v.phone === null ? '' : String(v.phone),
        email: v.email ?? '',
        status: v.status ?? 'active',
        notes: v.notes ?? '',
      });
      this.loadedValue = this.form.getRawValue();
    } catch (err) {
      this.error.set(this.describeError(err));
    } finally {
      this.loadingVendor.set(false);
      this.form.enable();
    }
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
      const vendor = await this.saveVendor();
      if (this.isEdit()) {
        this.success.set(`"${vendor.name}" updated.`);
        this.loadedValue = this.form.getRawValue();
      } else {
        this.success.set(`"${vendor.name}" saved.`);
        this.form.reset();
      }
      this.saved.emit(vendor);
    } catch (err) {
      this.error.set(this.describeError(err));
    } finally {
      this.saving.set(false);
      this.form.enable();
    }
  }

  /** POST a new vendor, or PATCH the one being edited. */
  private async saveVendor(): Promise<VendorRow> {
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
    const id = this.vendorId();
    const [vendor] = await firstValueFrom(
      this.api.apiCall(id ? `rest/v1/vendor?id=eq.${id}` : 'rest/v1/vendor', id ? 'PATCH' : 'POST', row, true, {
        schema: SCHEMA,
        headers: { Prefer: 'return=representation' },
      }),
    );
    if (!vendor) throw new Error('Vendor not found.');
    return vendor as VendorRow;
  }

  private describeError(err: unknown): string {
    const e = err as { error?: { code?: string; message?: string }; message?: string; status?: number };
    if (e?.status === 401 || e?.status === 403) return 'You are not authorized to manage vendors. Please sign in again.';
    if (e?.error?.code === '23505') return 'A vendor with that name already exists.';
    return e?.error?.message ?? e?.message ?? 'Something went wrong while saving the vendor.';
  }
}
