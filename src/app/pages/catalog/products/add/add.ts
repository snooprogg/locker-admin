import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormControl, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink }                                           from '@angular/router';
import { LucideX }                                                              from '@lucide/angular';
import { firstValueFrom }                                                       from 'rxjs';
import { ApiCallsService }                                                      from '../../../../services/apicalls.service';
import { ProductRow, ProductStatus, VendorRow }                                 from '../../../../models/site';
import { CATEGORIES, STATUSES, SELLING_UNITS, PURCHASE_UNITS, NEW_VENDOR }      from '../../../../services/formdata.service';
import { AddVendor }                                                            from '../../vendors/add/add';
import { Toast }                                                                from '../../../../components/toast/toast';
import { FunctionsService }                                                     from '../../../../services/functions.service';

const SCHEMA            = 'catalog';
const IMAGE_BUCKET      = 'product-images';
const MAX_IMAGE_BYTES   = 4 * 1024 * 1024;
const IMAGE_TYPES       = ['image/png', 'image/jpeg', 'image/webp'];

@Component({
  selector:         'app-add-product',
  imports:          [ReactiveFormsModule, RouterLink, LucideX, AddVendor, Toast],
  templateUrl:      './add.html',
  styleUrl:         './add.css',
  changeDetection:  ChangeDetectionStrategy.OnPush,
  host:             { class: 'block', '(document:keydown.escape)': 'closeVendorOverlay()' },
})

export class AddProducts implements OnInit {
  private fb    = inject(NonNullableFormBuilder);
  private api   = inject(ApiCallsService);
  private route = inject(ActivatedRoute);
  private fs    = inject(FunctionsService);

  /** Set when editing an existing product (route `catalog/products/edit/:id`). */
  productId       = signal<string | null>(null);
  isEdit          = computed(() => this.productId() !== null);
  loadingProduct  = signal(false);
  /** Snapshot of the loaded product's form values so Discard can revert to them. */
  private loadedValue: ReturnType<AddProducts['form']['getRawValue']> | null = null;
  private loadedImageUrl: string | null = null;

  readonly categories    = CATEGORIES;
  readonly statuses      = STATUSES;
  readonly sellingUnits  = SELLING_UNITS;
  readonly purchaseUnits = PURCHASE_UNITS;
  readonly NEW_VENDOR    = NEW_VENDOR;
  readonly imageTypes    = IMAGE_TYPES.join(',');

  vendors         = signal<Pick<VendorRow, 'id' | 'name'>[]>([]);
  vendorsError    = signal<string | null>(null);
  vendorOverlay   = signal(false);

  imagePreview    = signal<string | null>(null);
  imageError      = signal<string | null>(null);
  dragging        = signal(false);
  saving          = signal(false);
  error           = signal<string | null>(null);
  success         = signal<string | null>(null);

  form = this.fb.group({
    name:               ['', [Validators.required, Validators.maxLength(120)]],
    sku:                [''],
    description:        [''],
    barcode:            [''],
    category:           ['', Validators.required],
    status:             this.fb.control<ProductStatus>('active'),
    image:              new FormControl<File | null>(null),
    sellingUnit:        [SELLING_UNITS[0].value],
    sellingPrice:       this.fb.control<number | null>(null, [Validators.required, Validators.min(0)]),
    taxable:            [true],
    vendor:             [''],
    vendorSku:          [''],
    purchaseUnit:       [PURCHASE_UNITS[0].value],
    qtyPerPurchaseUnit: this.fb.control<number | null>(null, Validators.min(1)),
    purchaseCost:       this.fb.control<number | null>(null, Validators.min(0)),
    minOrderQty:        this.fb.control<number | null>(null, Validators.min(0)),
    reorderUrl:         ['', Validators.pattern(/^https?:\/\/.+/i)],
    orderingNotes:      [''],
  });

  get f() {
    return this.form.controls;
  }

    async ngOnInit() {
      this.fs.show();
    await this.loadVendors();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.productId.set(id);
     await this.loadProduct(id);
    }
    this.fs.hide();
  }

  private async loadProduct(id: string) {
    this.loadingProduct.set(true);
    this.form.disable();
    try {
      const [p] = (await firstValueFrom(
        this.api.apiCall(`rest/v1/products?id=eq.${id}&select=*`, 'GET', null, true, { schema: SCHEMA }),
      )) as ProductRow[];
      if (!p) throw new Error('Product not found.');
      this.form.patchValue({
        name:               p.product_name,
        sku:                p.internal_sku ?? '',
        description:        p.description ?? '',
        barcode:            p.barcode_upc ?? '',
        category:           p.category ?? '',
        status:             p.status,
        sellingUnit:        p.selling_unit ?? SELLING_UNITS[0].value,
        sellingPrice:       p.selling_price,
        taxable:            p.taxable,
        vendor:             p.vendor_id ?? '',
        vendorSku:          p.vendor_sku ?? '',
        purchaseUnit:       p.purchase_unit ?? PURCHASE_UNITS[0].value,
        qtyPerPurchaseUnit: p.quantity_per_purchase_unit,
        purchaseCost:       p.current_purchase_cost,
        minOrderQty:        p.minimum_order_quantity,
        reorderUrl:         p.reorder_url ?? '',
        orderingNotes:      p.ordering_notes ?? '',
      });
      this.loadedValue = this.form.getRawValue();
      this.loadedImageUrl = p.product_image_url;
      this.imagePreview.set(p.product_image_url);
    } catch (err) {
      this.error.set(this.describeError(err));
    } finally {
      this.loadingProduct.set(false);
      this.form.enable();
    }
  }

  invalid(name: keyof typeof this.form.controls) {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  private async loadVendors() {
    this.vendorsError.set(null);
    try {
      const rows = await firstValueFrom(
        this.api.apiCall('rest/v1/vendor?select=id,name&order=name.asc', 'GET', null, true, { schema: SCHEMA }),
      );
      this.vendors.set(rows as Pick<VendorRow, 'id' | 'name'>[]);
    } catch (err) {
      this.vendorsError.set(this.describeError(err));
    }
  }

  onVendorChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    if (select.value === NEW_VENDOR) {
      // Reset to "Select vendor…"; the overlay sets the real value once a vendor is saved
      this.f.vendor.setValue('');
      this.vendorOverlay.set(true);
    }
  }

  openVendorOverlay() {
    this.vendorOverlay.set(true);
  }

  closeVendorOverlay() {
    this.vendorOverlay.set(false);
  }

  onVendorCreated(vendor: VendorRow) {
    this.vendors.update((list) =>
      [...list.filter((v) => v.id !== vendor.id), { id: vendor.id, name: vendor.name }].sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    );
    this.f.vendor.setValue(vendor.id);
    this.f.vendor.markAsDirty();
    this.closeVendorOverlay();
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
    if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
    this.imagePreview.set(file ? URL.createObjectURL(file) : null);
    this.f.image.setValue(file);
    this.f.image.markAsDirty();
  }

  onDiscard() {
    this.setImage(null);
    this.error.set(null);
    this.success.set(null);
    if (this.loadedValue) {
      this.form.reset(this.loadedValue);
      this.imagePreview.set(this.loadedImageUrl);
    } else {
      this.form.reset();
    }
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
      const product = await this.saveProduct(v);
      if (v.image) await this.attachImage(product.id, v.image);
      if (this.isEdit()) {
        this.success.set(`"${product.product_name}" updated.`);
        this.f.image.setValue(null);
        this.loadedValue = this.form.getRawValue();
        if (v.image) this.loadedImageUrl = this.imagePreview();
      } else {
        this.success.set(`"${product.product_name}" saved.`);
        this.setImage(null);
        this.form.reset();
      }
    } catch (err) {
      this.error.set(this.describeError(err));
    } finally {
      this.saving.set(false);
      this.form.enable();
    }
  }

  /** POST a new product, or PATCH the one being edited. */
  private async saveProduct(v: ReturnType<typeof this.form.getRawValue>): Promise<ProductRow> {
    const text = (s: string) => (s.trim() === '' ? null : s.trim());
    const row = {
      product_name:               v.name.trim(),
      description:                text(v.description),
      internal_sku:               text(v.sku),
      barcode_upc:                text(v.barcode),
      category:                   text(v.category),
      status:                     v.status,
      selling_unit:               text(v.sellingUnit),
      selling_price:              v.sellingPrice,
      taxable:                    v.taxable,
      // Only send vendor_id when one is chosen so the DB default still applies otherwise
      ...(v.vendor && v.vendor !== NEW_VENDOR ? { vendor_id: v.vendor } : {}),
      vendor_sku:                 text(v.vendorSku),
      purchase_unit:              text(v.purchaseUnit),
      quantity_per_purchase_unit: v.qtyPerPurchaseUnit,
      current_purchase_cost:      v.purchaseCost,
      minimum_order_quantity:     v.minOrderQty,
      reorder_url:                text(v.reorderUrl),
      ordering_notes:             text(v.orderingNotes),
    };
    const id = this.productId();
    const [product] = await firstValueFrom(
      this.api.apiCall(id ? `rest/v1/products?id=eq.${id}` : 'rest/v1/products', id ? 'PATCH' : 'POST', row, true, {
        schema: SCHEMA,
        headers: { Prefer: 'return=representation' },
      }),
    );
    if (!product) throw new Error('Product not found.');
    return product as ProductRow;
  }

  /** Upload to storage, record it in catalog.images, and set the product's image URL. */
  private async attachImage(productId: string, file: File) {
    const safeName = file.name.replace(/[^\w.-]+/g, '_');
    const objectPath = `${productId}/${Date.now()}-${safeName}`;

    await firstValueFrom(this.api.apiCall(`storage/v1/object/${IMAGE_BUCKET}/${objectPath}`, 'POST', file, true));

    // Demote any existing primary image so the new one takes over
    await firstValueFrom(
      this.api.apiCall(
        `rest/v1/images?product_id=eq.${productId}&is_primary=eq.true`,
        'PATCH',
        { is_primary: false },
        true,
        { schema: SCHEMA },
      ),
    );

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
