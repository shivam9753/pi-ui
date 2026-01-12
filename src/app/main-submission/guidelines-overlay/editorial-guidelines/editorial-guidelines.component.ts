import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-editorial-guidelines',
  imports: [CommonModule],
  templateUrl: './editorial-guidelines.component.html',
  styleUrl: './editorial-guidelines.component.css'
})
export class EditorialGuidelinesComponent {
  @Input() title!: string;
  @Input() variant: 'green' | 'red' = 'green';
  @Input() items!: { label: string; description: string }[];
}
