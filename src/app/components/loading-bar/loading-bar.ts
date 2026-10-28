import {
  ChangeDetectionStrategy,
  Component,
  input,
} from '@angular/core';

@Component({
  selector: 'app-loading-bar',
  templateUrl: './loading-bar.html',
  styleUrl: './loading-bar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingBar {
  readonly height = input('4px');
  readonly color = input('currentColor');
}