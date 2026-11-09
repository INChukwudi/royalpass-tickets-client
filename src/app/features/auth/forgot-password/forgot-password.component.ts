import {Component, inject, signal} from '@angular/core';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {AuthService} from '../../../core/services/auth.service';

@Component({selector:'app-forgot-password',standalone:true,imports:[ReactiveFormsModule,RouterLink],templateUrl:'./forgot-password.component.html',styleUrl:'../login/login.component.scss'})
export class ForgotPasswordComponent {
  private readonly fb=inject(FormBuilder);private readonly auth=inject(AuthService);
  readonly loading=signal(false);readonly sent=signal(false);
  readonly form=this.fb.nonNullable.group({email:['',[Validators.required,Validators.email]]});
  submit(){if(this.form.invalid)return;this.loading.set(true);this.auth.forgotPassword(this.form.controls.email.value).subscribe({next:()=>{this.loading.set(false);this.sent.set(true)},error:()=>{this.loading.set(false);this.sent.set(true)}});}
}
