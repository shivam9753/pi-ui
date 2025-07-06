import { TitleCasePipe } from '@angular/common';
import { Component, Input } from '@angular/core';


@Component({
  selector: 'app-review-status',
  imports: [TitleCasePipe],
  templateUrl: './review-status.component.html',
  styleUrl: './review-status.component.css'
})
export class ReviewStatusComponent {
  @Input() status: string = "pending_review";
}
