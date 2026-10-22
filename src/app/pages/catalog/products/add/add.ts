import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideX } from '@lucide/angular';
import { firstValueFrom } from 'rxjs';
import { ApiCallsService } from '../../../../services/apicalls.service';

const SCHEMA = 'catalog';
const IMAGE_BUCKET = 'product-images';

/** Row shape of catalog.products */
export interface ProductRow {
  id: string;
  product_name: string;
  description: string | null;
  internal_sku: string | null;
  barcode_upc: string | null;
  category: string | null;
  product_image_url: string | null;
  status: ProductStatus;
  selling_unit: string | null;
  selling_price: number | null;
  taxable: boolean;
  vendor_id: string;
  vendor_sku: string | null;
  purchase_unit: string | null;
  quantity_per_purchase_unit: number | null;
  current_purchase_cost: number | null;
  minimum_order_quantity: number | null;
  reorder_url: string | null;
  ordering_notes: string | null;
  created_at: string;
  updated_at: string;
}

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
  imports: [ReactiveFormsModule, LucideX],
  templateUrl: './add.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class AddProducts {
  private fb = inject(NonNullableFormBuilder);
  private api = inject(ApiCallsService);

  readonly categories = CATEGORIES;
  readonly statuses = STATUSES;
  readonly sellingUnits = SELLING_UNITS;
  readonly purchaseUnits = PURCHASE_UNITS;
  readonly vendors = VENDORS;

  readonly imageTypes = IMAGE_TYPES.join(',');
  imagePreview = signal<string | null>(null);
  imageError = signal<string | null>(null);
  dragging = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);

  form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    sku: [''],
    description: [''],
    barcode: [''],
    category: ['', Validators.required],
    status: this.fb.control<ProductStatus>('active'),
    image: new FormControl<File | null>(null),
    sellingUnit: [SELLING_UNITS[0].value],
    sellingPrice: this.fb.control<number | null>(null, [Validators.required, Validators.min(0)]),
    taxable: [true],
    vendor: [''],
    vendorSku: [''],
    purchaseUnit: [PURCHASE_UNITS[0].value],
    qtyPerPurchaseUnit: this.fb.control<number | null>(null, Validators.min(1)),
    purchaseCost: this.fb.control<number | null>(null, Validators.min(0)),
    minOrderQty: this.fb.control<number | null>(null, Validators.min(0)),
    reorderUrl: ['', Validators.pattern(/^https?:\/\/.+/i)],
    orderingNotes: [''],
  });

  get f() {
    return this.form.controls;
  }

  invalid(name: keyof typeof this.form.controls) {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  setStatus(status: ProductStatus) {
    this.f.status.setValue(status);
    this.f.status.markAsDirty();
  }

  setTaxable(taxable: boolean) {
    this.f.taxable.setValue(taxable);
    this.f.taxable.markAsDirty();
  }

  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.setImage(input.files?.[0] ?? null);
    input.value = '';
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.dragging.set(true);
  }

  onDragLeave() {
    this.dragging.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.dragging.set(false);
    this.setImage(event.dataTransfer?.files?.[0] ?? null);
  }

  clearImage() {
    this.setImage(null);
  }

  private setImage(file: File | null) {
    this.imageError.set(null);
    if (file) {
      if (!IMAGE_TYPES.includes(file.type)) {
        this.imageError.set('Only PNG, JPG, or WEBP images are allowed.');
        return;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        this.imageError.set('Image must be 4 MB or smaller.');
        return;
      }
    }
    const prev = this.imagePreview();
    if (prev) URL.revokeObjectURL(prev);
    this.imagePreview.set(file ? URL.createObjectURL(file) : null);
    this.f.image.setValue(file);
    this.f.image.markAsDirty();
  }

  onDiscard() {
    this.setImage(null);
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
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.form.disable();

    try {
      const product = await this.insertProduct(v);
      if (v.image) await this.attachImage(product.id, v.image);
      this.success.set(`"${product.product_name}" saved.`);
      this.setImage(null);
      this.form.reset();
    } catch (err) {
      this.error.set(this.describeError(err));
    } finally {
      this.saving.set(false);
      this.form.enable();
    }
  }

  private async insertProduct(v: ReturnType<typeof this.form.getRawValue>): Promise<ProductRow> {
    const text = (s: string) => (s.trim() === '' ? null : s.trim());
    const row = {
      product_name: v.name.trim(),
      description: text(v.description),
      internal_sku: text(v.sku),
      barcode_upc: text(v.barcode),
      category: text(v.category),
      status: v.status,
      selling_unit: text(v.sellingUnit),
      selling_price: v.sellingPrice,
      taxable: v.taxable,
      vendor_sku: text(v.vendorSku),
      purchase_unit: text(v.purchaseUnit),
      quantity_per_purchase_unit: v.qtyPerPurchaseUnit,
      current_purchase_cost: v.purchaseCost,
      minimum_order_quantity: v.minOrderQty,
      reorder_url: text(v.reorderUrl),
      ordering_notes: text(v.orderingNotes),
    };
    const [product] = await firstValueFrom(
      this.api.apiCall('rest/v1/products', 'POST', row, true, {
        schema: SCHEMA,
        headers: { Prefer: 'return=representation' },
      }),
    );
    return product as ProductRow;
  }

  /** Upload to storage, record it in catalog.images, and set the product's image URL. */
  private async attachImage(productId: string, file: File) {
    const safeName = file.name.replace(/[^\w.-]+/g, '_');
    const objectPath = `${productId}/${Date.now()}-${safeName}`;

    await firstValueFrom(this.api.apiCall(`storage/v1/object/${IMAGE_BUCKET}/${objectPath}`, 'POST', file, true));

    await firstValueFrom(
      this.api.apiCall(
        'rest/v1/images',
        'POST',
        { product_id: productId, bucket_id: IMAGE_BUCKET, object_path: objectPath, is_primary: true, alt_text: file.name },
        true,
        { schema: SCHEMA },
      ),
    );

    await firstValueFrom(
      this.api.apiCall(
        `rest/v1/products?id=eq.${productId}`,
        'PATCH',
        { product_image_url: this.api.publicUrl(IMAGE_BUCKET, objectPath) },
        true,
        { schema: SCHEMA },
      ),
    );
  }

  private describeError(err: unknown): string {
    const e = err as { error?: { message?: string; details?: string; hint?: string }; message?: string; status?: number };
    if (e?.status === 401 || e?.status === 403) return 'You are not authorized to add products. Please sign in again.';
    return e?.error?.message ?? e?.message ?? 'Something went wrong while saving the product.';
  }
}
