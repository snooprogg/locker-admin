
/*
import { Component } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-sidebar',
  styleUrl: './sidebar.css',
  templateUrl: './sidebar.html',
})
export class Sidebar {}
*/
import { ChangeDetectionStrategy,Component,effect,inject,input,model,output,signal,untracked} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map } from 'rxjs';
import { LucideBell, LucideBox, LucideBriefcase, LucideChevronDown, LucideChevronLeft, LucideCirclePlus,LucideDynamicIcon,LucideIcon,LucideLayoutGrid,LucideLock,LucideLogOut,LucidePackage,LucideReceiptText,LucideSettings,LucideTag,LucideUsers } from '@lucide/angular';

export interface NavItem {
  label: string;
  icon?: LucideIcon;
  /** Router path. Omit for items that only expand children. */
  route?: string;
  /** Match the route exactly instead of as a prefix (use for '/'). */
  exact?: boolean;
  badge?: number;
  children?: NavItem[];
}

/** A top-level entry: a link, a collapsible group (has children), or a divider. */
export type NavEntry = NavItem | 'divider';

export const DEFAULT_NAV: NavEntry[] = [
  { label: 'Overview', icon: LucideLayoutGrid, route: '/', exact: true },
  'divider',
  {
    label: 'Catalog',
    icon: LucideTag,
    children: [
      {
        label: 'Products',
        icon: LucidePackage,
        children: [
          { label: 'Add', route: '/catalog/products/add' },
        ],
      },
      { label: 'Vendors', icon: LucideBriefcase, 
        children: [
          { label: 'Add', route: '/catalog/vendors/add' },
        ] 
      },
    ],
  },
  {
    label: 'Lockers',
    icon: LucideLock,
    children: [
      { label: 'Add New', icon: LucideCirclePlus, route: '/lockers/new' },
      { label: 'Manage', icon: LucideSettings, route: '/lockers/manage' },
    ],
  },
  'divider',
  { label: 'Inventory', icon: LucideBox, route: '/inventory' },
  { label: 'Transactions', icon: LucideReceiptText, route: '/transactions' },
  { label: 'Users', icon: LucideUsers, route: '/users' },
  { label: 'Alerts', icon: LucideBell, route: '/alerts', badge: 3 },
  { label: 'Settings', icon: LucideSettings, route: '/settings' },
];

const MATCH_SUBSET = {
  paths: 'subset',
  queryParams: 'ignored',
  fragment: 'ignored',
  matrixParams: 'ignored',
} as const;
const MATCH_EXACT = { ...MATCH_SUBSET, paths: 'exact' } as const;

@Component({
  imports: [
    RouterLink,
    LucideDynamicIcon,
    LucideChevronDown,
    LucideChevronLeft,
    LucideLogOut,
  ],
  selector: 'app-sidebar',
  styleUrl: './sidebar.css',
  templateUrl: './sidebar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full' },
})
export class Sidebar {
  private readonly router = inject(Router);

  readonly items = input<NavEntry[]>(DEFAULT_NAV);
  readonly brand = input('Spoke');
  readonly subtitle = input('Lockers');
  /** Two-way bindable: <app-sidebar [(collapsed)]="sidebarCollapsed" /> */
  readonly collapsed = model(false);
  readonly signOut = output<void>();

  /** Keys of expanded groups / items. */
  private readonly openKeys = signal<ReadonlySet<string>>(new Set());

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );

  constructor() {
    // Auto-expand whatever contains the active route.
    effect(() => {
      this.url();
      const items = this.navItems();
      untracked(() => {
        const keys = new Set(this.openKeys());
        const visit = (list: NavItem[], parent: string) => {
          for (const item of list) {
            const k = this.key(item, parent);
            if (item.children && this.isActive(item)) {
              keys.add(k);
              visit(item.children, k);
            }
          }
        };
        visit(items, '');
        this.openKeys.set(keys);
      });
    });
  }

  key(item: NavItem, parent = ''): string {
    return parent ? `${parent}/${item.label}` : item.label;
  }

  isOpen(key: string): boolean {
    return this.openKeys().has(key);
  }

  toggle(key: string): void {
    this.openKeys.update((s) => {
      const next = new Set(s);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  /** True for a link on the current route, or a group containing one. */
  isActive(item: NavItem): boolean {
    this.url(); // re-evaluate on navigation
    if (item.route) {
      return this.router.isActive(item.route, item.exact ? MATCH_EXACT : MATCH_SUBSET);
    }
    return !!item.children?.some((c) => this.isActive(c));
  }

  isDivider(entry: NavEntry): entry is 'divider' {
    return entry === 'divider';
  }

  asItem(entry: NavEntry): NavItem {
    return entry as NavItem;
  }

  private navItems(): NavItem[] {
    return this.items().filter((e): e is NavItem => e !== 'divider');
  }
}
