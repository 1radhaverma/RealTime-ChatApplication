import { Component, inject, signal } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { FormsModule,NgForm } from '@angular/forms';
import { MatSnackBar} from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiResponse } from '../models/api-response';
import { Router, RouterLink } from '@angular/router';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-register',
  imports: [MatFormFieldModule,FormsModule, MatIconModule , MatButtonModule, MatInputModule, RouterLink,NgIf],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {

 email!:string;
 password!: string;
 fullName!: string;
 userName!: string;
 profilePicture: string ='https://static.vecteezy.com/system/resources/thumbnails/048/926/084/small_2x/silver-membership-icon-default-avatar-profile-icon-membership-icon-social-media-user-image-illustration-vector.jpg';
 profileImage: File | null = null ; 

 authService = inject(AuthService);
 snackBar = inject(MatSnackBar);
 router = inject(Router);
  hidePassword = true;


register(){
 let formData = new FormData();
 formData.append("email",this.email);
 formData.append("password",this.password);
 formData.append("fullName",this.fullName);
 formData.append("userName",this.userName);
 formData.append("profileImage",this.profileImage!);

this.authService.register(formData).subscribe({
next:()=>{
this.snackBar.open('User registered successfully','Close');
},
error:(error:HttpErrorResponse)=>{
     let err = error.error as ApiResponse<string>;
     this.snackBar.open(err.error,"Close");
},
complete:()=>{
  this.router.navigate(['/']);
},

});
}


 onFileSelected(event: any) {
  const file:File = event.target.files[0];
  if(file){
  this.profileImage = file;
  
  const reader = new FileReader();
  reader.onload=(e)=>{
    this.profilePicture = e.target!.result as string;
    console.log(e.target?.result);
  };
  reader.readAsDataURL(file);
  console.log(this.profilePicture);
   }
 }
   togglePassword(event: Event): void {
  event.preventDefault();
  this.hidePassword = !this.hidePassword;
}
  hide(): boolean {
  return this.hidePassword;
}
}
