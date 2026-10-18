import { ChangeDetectionStrategy, Component, OnDestroy, inject, output, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideChevronDown, LucideImage, LucideX } from '@lucide/angular';

export type ProductStatus = 'active' | 'draft' | 'inactive';

export interface Option<T = string> {
  value: T;
  label: string;
}

export const CATEGORIES: Option[] = [
  { value: 'locker-units', label: 'Locker Units' },
  { value: 'accessories', label: 'Accessories' },
  { value: 'spare-parts', label: 'Spare Parts' },
  { value: 'consumables', label: 'Consumables' },
  { value: 'software', label: 'Software' },
];

export const STATUSES: Option<ProductStatus>[] = [
  { value: 'active', label: 'Active' },
  { value: 'draft', label: 'Draft' },
  { value: 'inactive', label: 'Inactive' },
];

export const SELLING_UNITS: Option[] = ['Each', 'Box', 'Pack', 'Pair', 'Set', 'Kit', 'Bundle'].map(
  (l) => ({ value: l.toLowerCase(), label: l }),
);

export const PURCHASE_UNITS: Option[] = ['Case', 'Box', 'Each', 'Pallet', 'Carton'].map((l) => ({
  value: l.toLowerCase(),
  label: l,
}));

export const VENDORS: Option[] = [
  { value: 'spoke', label: 'Spoke Technologies' },
  { value: 'acme', label: 'Acme Lockers Ltd.' },
  { value: 'securebox', label: 'SecureBox Inc.' },
  { value: 'novatech', label: 'NovaTech Systems' },
];

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

@Component({
  selector: 'app-add-product',
  imports: [ReactiveFormsModule, NgTemplateOutlet, LucideChevronDown, LucideImage, LucideX],
  templateUrl: './add.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class AddProducts implements OnDestroy {
  private readonly fb = inject(NonNullableFormBuilder);

  /** Emits the form value when Save is clicked and the form is valid. */
  readonly save = output<AddProducts['form']['value']>();
  readonly discard = output<void>();

  readonly categories = CATEGORIES;
  readonly statuses = STATUSES;
  readonly sellingUnits = SELLING_UNITS;
  readonly purchaseUnits = PURCHASE_UNITS;
  readonly vendors = VENDORS;
  readonly taxableOptions: Option<boolean>[] = [
    { value: true, label: 'Yes' },
    { value: false, label: 'No' },
  ];

  readonly form = this.fb.group({
    basic: this.fb.group({
      name: ['', Validators.required],
      sku: [''],
      description: [''],
      barcode: [''],
      category: [''],
      status: this.fb.control<ProductStatus>('active'),
      image: this.fb.control<File | null>(null),
    }),
    sales: this.fb.group({
      sellingUnit: ['each'],
      sellingPrice: this.fb.control<number | null>(null, [Validators.required, Validators.min(0)]),
      taxable: [true],
    }),
    vendor: this.fb.group({
      vendorId: [''],
      vendorSku: [''],
      purchaseUnit: ['case'],
      qtyPerPurchaseUnit: this.fb.control<number | null>(null, Validators.min(1)),
      purchaseCost: this.fb.control<number | null>(null, Validators.min(0)),
      minOrderQty: this.fb.control<number | null>(null, Validators.min(1)),
      reorderUrl: ['', Validators.pattern(/^https?:\/\/.+/i)],
      orderingNotes: [''],
    }),
  });

  readonly imagePreview = signal<string | null>(null);
  readonly imageError = signal<string | null>(null);
  readonly dragging = signal(false);

  // Shared Tailwind class strings (Tailwind v4 picks these up from .ts files too).
  readonly labelCls =
    'mb-[5px] block text-[11px] leading-[16.5px] font-medium tracking-[0.03em] text-fg/45';
  readonly btnSecondary =
    'rounded border border-fg/7 px-[18px] py-[9px] text-[13px] leading-[19.5px] text-fg/45 transition-colors duration-150 hover:border-fg/15 hover:text-fg/75';
  readonly btnPrimary =
    'rounded bg-green px-5 py-[9px] text-[13px] leading-[19.5px] font-semibold tracking-[0.04em] text-ink shadow-[0_2px_8px] shadow-green/25 transition-colors duration-150 hover:bg-green-dark';
  private readonly controlBase =
    'w-full rounded border px-3 py-[9px] text-[13px] leading-[19.5px] text-fg outline-none transition-colors duration-150 placeholder:text-fg/50 focus:bg-fg/6 ';
  readonly selectCls = 'cursor-pointer appearance-none pr-8';
  readonly numberCls =
    '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';
  private readonly controlOk = 'border-fg/7 bg-fg/4 focus:border-green';
  private readonly controlErr = 'border-error bg-fg/4 focus:border-error';

  /** Classes for an input/select/textarea, switching to the error border when invalid. */
  control(path: string, extra = ''): string {
    return this.controlBase + (this.showError(path) ? this.controlErr : this.controlOk) + ' ' + extra;
  }

  /** Classes for one segment of a segmented toggle (Status, Taxable). */
  segment(on: boolean): string {
    return (
      'rounded border px-4 py-[7px] text-xs leading-[18px] transition-colors duration-150 ' +
      (on
        ? 'border-green bg-green/10 font-medium text-green'
        : 'border-fg/7 bg-fg/3 text-fg/45 hover:text-fg/75')
    );
  }

  /** True when the control at `path` (e.g. 'basic.name') should show an error. */
  showError(path: string): boolean {
    const c = this.form.get(path);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    // Not wired to a backend yet — log it and let a parent handle it if it wants.
    console.log('Add product', this.form.getRawValue());
    this.save.emit(this.form.getRawValue());
  }

  onDiscard(): void {
    this.form.reset();
    this.clearImage();
    this.discard.emit();
  }

  // ---- Image dropzone ------------------------------------------------------

  onFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.setImage(input.files?.[0] ?? null);
    input.value = ''; // allow re-selecting the same file
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(true);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    this.setImage(event.dataTransfer?.files?.[0] ?? null);
  }

  clearImage(): void {
    this.revokePreview();
    this.imagePreview.set(null);
    this.imageError.set(null);
    this.form.controls.basic.controls.image.setValue(null);
  }

  private setImage(file: File | null): void {
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) {
      this.imageError.set('Use a PNG, JPG, or WEBP image.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      this.imageError.set('Image must be 4 MB or smaller.');
      return;
    }
    this.revokePreview();
    this.imageError.set(null);
    this.imagePreview.set(URL.createObjectURL(file));
    this.form.controls.basic.controls.image.setValue(file);
  }

  private revokePreview(): void {
    const url = this.imagePreview();
    if (url) URL.revokeObjectURL(url);
  }

  ngOnDestroy(): void {
    this.revokePreview();
  }
}
