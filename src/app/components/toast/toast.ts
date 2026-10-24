import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { LucideCheck, LucideCircleAlert, LucideX } from '@lucide/angular';

export type ToastType = 'success' | 'error';

/**
 * Floating top-right notification. Renders nothing when `message` is null,
 * so the parent can bind a nullable signal directly:
 *   <app-toast [message]="error()" type="error" (closed)="error.set(null)" />
 */
@Component({
  selector: 'app-toast',
  imports: [LucideCheck, LucideCircleAlert, LucideX],
  templateUrl: './toast.html',
  styleUrl: './toast.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class Toast {
  readonly message = input<string | null>(null);
  readonly type = input<ToastType>('success');
  readonly closed = output<void>();
}
