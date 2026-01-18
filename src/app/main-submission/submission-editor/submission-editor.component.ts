import { Component, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BackendService } from 'src/app/services/backend.service';
import { AuthService } from 'src/app/services/auth.service';
import { ModalService } from 'src/app/services/modal.service';

@Component({
  selector: 'app-your-component',
  templateUrl: './your-component.component.html',
  styleUrls: ['./your-component.component.css'],
})
export class YourComponent {
  // topic pitch properties removed

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private backendService: BackendService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private modalService: ModalService
  ) {
    // Topic pitch query param handling removed
  }

  // Topic pitch handler removed
}