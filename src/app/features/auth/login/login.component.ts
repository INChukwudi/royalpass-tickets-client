import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  readonly showPassword = signal(false);
  readonly isLoading = this.authService.isLoading;
  readonly form: FormGroup = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });

  onSubmit() {
    if (this.form.invalid) return;
    this.authService.login(this.form.value).subscribe({
      next: () => {
        this.toast.success('Welcome back!');
        const returnUrl = this.authService.consumeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl'));
        returnUrl
          ? this.router.navigateByUrl(returnUrl)
          : this.router.navigate([this.authService.landingRoute()]);
      },
      error: (err) => {
        const message = err?.error?.message ?? 'Login failed. Please check your credentials.';
        this.toast.error(message);
      }
    });
  }
}
