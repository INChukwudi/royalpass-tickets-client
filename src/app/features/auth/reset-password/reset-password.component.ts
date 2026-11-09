import {Component, inject, signal} from '@angular/core';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {ActivatedRoute, RouterLink} from '@angular/router';
import {AuthService} from '../../../core/services/auth.service';

@Component({selector:'app-reset-password',standalone:true,imports:[ReactiveFormsModule,RouterLink],templateUrl:'./reset-password.component.html',styleUrl:'../login/login.component.scss'})
export class ResetPasswordComponent{
 private readonly fb=inject(FormBuilder);private readonly auth=inject(AuthService);private readonly route=inject(ActivatedRoute);
 readonly loading=signal(false);readonly complete=signal(false);readonly error=signal('');readonly token=this.route.snapshot.queryParamMap.get('token')??'';
 readonly form=this.fb.nonNullable.group({password:['',[Validators.required,Validators.minLength(10),Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)]],confirm:['',Validators.required]});
 submit(){if(this.form.invalid)return;if(this.form.value.password!==this.form.value.confirm){this.error.set('The passwords do not match.');return;}if(!this.token){this.error.set('This reset link is incomplete. Request a new one.');return;}this.loading.set(true);this.auth.resetPassword(this.token,this.form.controls.password.value).subscribe({next:()=>{this.loading.set(false);this.complete.set(true)},error:e=>{this.loading.set(false);this.error.set(e?.error?.message??'This reset link could not be used.')}});}
}
