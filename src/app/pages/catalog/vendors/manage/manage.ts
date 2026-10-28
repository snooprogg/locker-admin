import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpResponse } from '@angular/common/http';
import { LucideBriefcase, LucideChevronLeft, LucideChevronRight, LucidePencil } from '@lucide/angular';
import { firstValueFrom } from 'rxjs';
import { ApiCallsService } from '../../../../services/apicalls.service';
import { VendorListRow } from '../../../../models/site';
import { Toast } from '../../../../components/toast/toast';
import { FunctionsService } from '../../../../services/functions.service';

const SCHEMA    = 'catalog';
const PAGE_SIZE = 10;
const COLUMNS   = 'id,name,contact,phone,email';

@Component({
  selector: 'app-manage-vendors',
  imports: [RouterLink, LucideBriefcase, LucideChevronLeft, LucideChevronRight, LucidePencil, Toast],
  templateUrl: './manage.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class ManageVendors implements OnInit {
  private api = inject(ApiCallsService);
  private fs = inject(FunctionsService);

  readonly pageSize = PAGE_SIZE;

  rows    = signal<VendorListRow[]>([]);
  total   = signal(0);
  page    = signal(1);
  loading = signal(false);
  error   = signal<string | null>(null);

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

  /** Format the numeric phone column as (555) 123-4567 when it's a 10/11-digit NANP number. */
  formatPhone(phone: number | null) {
    if (phone === null) return '—';
    const d = String(phone);
    if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
    if (d.length === 11 && d.startsWith('1')) return `+1 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
    return d;
  }

  goTo(page: number) {
    if (page < 1 || page > this.pageCount() || page === this.page()) return;
    this.page.set(page);
    this.load();
  }

  async load() {
    this.loading.set(true);
    this.fs.show();
    this.error.set(null);
    const offset = (this.page() - 1) * PAGE_SIZE;
    try {
      const res = (await firstValueFrom(
        this.api.apiCall(
          `rest/v1/vendor?select=${COLUMNS}&order=name.asc&limit=${PAGE_SIZE}&offset=${offset}`,
          'GET',
           null,
           true,
          { schema: SCHEMA, headers: { Prefer: 'count=exact' }, observe: 'response' },
        ),
      )) as HttpResponse<VendorListRow[]>;
      this.rows.set(res.body ?? []);
      // Content-Range looks like "0-9/23" (or "*/0" when empty)
      const total = Number(res.headers.get('content-range')?.split('/')[1] ?? 0);
      this.total.set(Number.isFinite(total) ? total : 0);
      if (this.rows().length === 0 && this.page() > 1) {
        this.page.update((p) => p - 1);
        await this.load();
      }
    } catch (err) {
      this.error.set(this.describeError(err));
    } finally {
      this.loading.set(false);
      this.fs.hide();
    }
  }

  private describeError(err: unknown): string {
    const e = err as { error?: { message?: string }; message?: string; status?: number };
    if (e?.status === 401 || e?.status === 403) return 'You are not authorized to manage vendors. Please sign in again.';
    return e?.error?.message ?? e?.message ?? 'Something went wrong while loading vendors.';
  }
}
