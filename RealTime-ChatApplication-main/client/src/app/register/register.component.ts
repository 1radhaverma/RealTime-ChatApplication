import { Component, inject, ViewChild } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { FormsModule, NgForm } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [MatFormFieldModule, FormsModule, MatIconModule, MatButtonModule, MatInputModule, RouterLink, NgIf],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  @ViewChild('userForm') userForm!: NgForm;
  email!: string;
  password!: string;
  fullName!: string;
  userName!: string;
  profilePicture: string = 'https://static.vecteezy.com/system/resources/thumbnails/048/926/084/small_2x/silver-membership-icon-default-avatar-profile-icon-membership-icon-social-media-user-image-illustration-vector.jpg';
  profileImage: File | null = null;

  authService = inject(AuthService);
  snackBar = inject(MatSnackBar);
  router = inject(Router);
  hidePassword = true;

  // Email validation - must end with @gmail.com
 isValidEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return email.toLowerCase().endsWith('@gmail.com');
}

  // Password validation
  isStrongPassword(password: string): boolean {
    const minLength = 5;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return password.length >= minLength && 
           hasUpperCase && 
           hasLowerCase && 
           hasNumbers && 
           hasSpecialChars;
  }

  // Username validation - alphanumeric only
  isAlphanumeric(username: string): boolean {
    return /^[a-zA-Z0-9]+$/.test(username);
  }

  register() {
    // Validate form before submission
    if (!this.userForm.valid) {
      this.snackBar.open('Please fill all required fields correctly', 'Close');
      return;
    }

    // Validate email
    if (!this.isValidEmail(this.email)) {
      this.snackBar.open('Only @gmail.com emails are allowed', 'Close');
      return;
    }

    // Validate username
    if (!this.isAlphanumeric(this.userName)) {
      this.snackBar.open('Username must be alphanumeric (letters and numbers only)', 'Close');
      return;
    }

    // Validate password strength
    if (!this.isStrongPassword(this.password)) {
      this.snackBar.open('Password must be at least 5 characters long and contain uppercase, lowercase, numbers, and special characters', 'Close');
      return;
    }

    // Validate profile image
    if (!this.profileImage) {
      this.snackBar.open('Profile image is required', 'Close');
      return;
    }

    // Create FormData with all fields
    const formData = new FormData();
    formData.append("email", this.email);
    formData.append("password", this.password);
    formData.append("fullName", this.fullName);
    formData.append("userName", this.userName);
    formData.append("profileImage", this.profileImage);

    // Show loading indicator
    const snackBarRef = this.snackBar.open('Registering...', 'Close');

    this.authService.register(formData).subscribe({
      next: (response) => {
        snackBarRef.dismiss();
        this.snackBar.open('Registration successful!', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
        this.router.navigate(['/login']);
      },
      error: (error: HttpErrorResponse) => {
        snackBarRef.dismiss();
        console.error('Registration error:', error);
        
        let errorMsg = 'Registration failed - please try again';
        
        if (error.error instanceof ErrorEvent) {
          errorMsg = 'Network error - please check your connection';
        } else {
          if (error.status === 0) {
            errorMsg = 'Unable to connect to server';
          } else if (error.status === 400) {
            errorMsg = error.error?.message || 'Invalid registration data or the user have already registered';
          } else if (error.status === 500) {
            errorMsg = error.error?.message || 'Server error - please try again later';
          }
        }
        
        this.snackBar.open(errorMsg, 'Close', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      // Validate image file type if needed
      if (!file.type.match('image.*')) {
        this.snackBar.open('Only image files are allowed', 'Close');
        return;
      }
      
      this.profileImage = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        this.profilePicture = e.target!.result as string;
      };
      reader.readAsDataURL(file);
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