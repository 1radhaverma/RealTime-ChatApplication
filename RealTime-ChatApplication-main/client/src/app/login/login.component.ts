import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiResponse } from '../models/api-response';
import { Router, RouterLink } from '@angular/router';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink, NgIf],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  email: string = '';
  password: string = '';
  
  hidePassword = true;

  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  login() {
    this.authService.login(this.email, this.password).subscribe({
      next: () => {
        this.authService.me().subscribe();
        this.snackBar.open("Logged in successfully", "Close");
      },
      error: (err: HttpErrorResponse) => {
        let error = err.error as ApiResponse<string>;
        this.snackBar.open(error.error, 'Close', {
          duration: 3000,
        });
      },
      complete: () => {
        this.router.navigate(['/']);
      }
    });
  }

  togglePassword(event: Event): void {
  event.preventDefault();
  this.hidePassword = !this.hidePassword;
}
  hide(): boolean {
  return this.hidePassword;
}
}