import { inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly snackBar = inject(MatSnackBar);

  show(message: string, type: ToastType = 'info', duration = 5000): void {
    this.snackBar.open(message, '✕', {
      duration,
      panelClass: [`toast-${type}`],
      horizontalPosition: 'right',
      verticalPosition: 'top',
    });
  }

  success(message: string, duration = 5000): void {
    this.show(message, 'success', duration);
  }

  error(message: string, duration = 6000): void {
    this.show(message, 'error', duration);
  }

  warning(message: string, duration = 5500): void {
    this.show(message, 'warning', duration);
  }

  info(message: string, duration = 5000): void {
    this.show(message, 'info', duration);
  }
}
