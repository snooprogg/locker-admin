import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpResponse } from '@angular/common/http';
import { LucideChevronLeft, LucideChevronRight, LucidePackage, LucidePencil } from '@lucide/angular';
import { firstValueFrom } from 'rxjs';
import { ApiCallsService } from '../../../../services/apicalls.service';
import { ProductListRow } from '../../../../models/site';
import { CATEGORIES } from '../../../../services/formdata.service';
import { Toast } from '../../../../components/toast/toast';

const SCHEMA    = 'catalog';
const PAGE_SIZE = 10;
const COLUMNS   = 'id,product_name,internal_sku,category,vendor_sku,status';

@Component({
  selector: 'app-manage-products',
  imports: [RouterLink, LucideChevronLeft, LucideChevronRight, LucidePackage, LucidePencil, Toast],
  templateUrl: './manage.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class ManageProducts implements OnInit {
  private api = inject(ApiCallsService);

  readonly pageSize = PAGE_SIZE;

  rows        = signal<ProductListRow[]>([]);
  total       = signal(0);
  page        = signal(1);
  loading     = signal(false);
  error       = signal<string | null>(null);
  success     = signal<string | null>(null);
  /** Ids whose status is currently being saved. */
  savingIds   = signal<Set<string>>(new Set());

  pageCount   = computed(() => Math.max(1, Math.ceil(this.total() / PAGE_SIZE)));
  rangeStart  = computed(() => (this.total() === 0 ? 0 : (this.page() - 1) * PAGE_SIZE + 1));
  rangeEnd    = computed(() => Math.min(this.page() * PAGE_SIZE, this.total()));
  /** Up to 5 page numbers centred on the current page. */
  pageNumbers = computed(() => {
    const count = this.pageCount();
    const start = Math.max(1, Math.min(this.page() - 2, count - 4));
    return Array.from({ length: Math.min(5, count) }, (_, i) => start + i);
  });

  ngOnInit() {
    this.load();
  }

  categoryLabel(value: string | null) {
    return CATEGORIES.find((c) => c.value === value)?.label ?? value ?? '—';
  }

  isSaving(id: string) {
    return this.savingIds().has(id);
  }

  goTo(page: number) {
    if (page < 1 || page > this.pageCount() || page === this.page()) return;
    this.page.set(page);
    this.load();
  }

  async load() {
    this.loading.set(true);
    this.error.set(null);
    const offset = (this.page() - 1) * PAGE_SIZE;
    try {
      const res = (await firstValueFrom(
        this.api.apiCall(
          `rest/v1/products?select=${COLUMNS}&order=product_name.asc&limit=${PAGE_SIZE}&offset=${offset}`,
          'GET',
          null,
          true,
          { schema: SCHEMA, headers: { Prefer: 'count=exact' }, observe: 'response' },
        ),
      )) as HttpResponse<ProductListRow[]>;
      this.rows.set(res.body ?? []);
      // Content-Range looks like "0-9/23" (or "*/0" when empty)
      const total = Number(res.headers.get('content-range')?.split('/')[1] ?? 0);
      this.total.set(Number.isFinite(total) ? total : 0);
      // If the page emptied out (e.g. after a count change), step back
      if (this.rows().length === 0 && this.page() > 1) {
        this.page.update((p) => p - 1);
        await this.load();
      }
    } catch (err) {
      this.error.set(this.describeError(err));
    } finally {
      this.loading.set(false);
    }
  }

  private describeError(err: unknown): string {
    const e = err as { error?: { message?: string }; message?: string; status?: number };
    if (e?.status === 401 || e?.status === 403) return 'You are not authorized to manage products. Please sign in again.';
    return e?.error?.message ?? e?.message ?? 'Something went wrong while loading products.';
  }
}
