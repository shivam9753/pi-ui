import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BadgeLabelComponent } from '../../utilities/badge-label/badge-label.component';
import { ButtonComponent } from '../button/button.component';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule, BadgeLabelComponent, ButtonComponent],
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss']
})
export class CardComponent {
  @Input() title = '';
  @Input() description?: string;

  // image handling
  @Input() imageSrc?: string;
  @Input() imageAlt = '';
  @Input() imagePosition: 'top' | 'bottom' | 'none' = 'top';

  // size: affects paddings and font-size
  @Input() size: 'sm' | 'md' | 'lg' = 'md';

  // border options
  @Input() border: 'default' | 'none' | 'dashed' = 'default';

  // badge - use existing BadgeLabelComponent if badgeType provided
  @Input() badgeText?: string; // fallback
  @Input() badgeType?: string;
  @Input() badgeVariant?: 'soft' | 'solid' | 'outline' | 'big-red';

  // preview content (replaces projection)
  @Input() previewTitle?: string;
  @Input() previewBody?: string;

  // action buttons
  @Input() showButton = false;
  @Input() buttonLabel = 'Buy Now';
  @Input() buttonVariant: 'primary' | 'secondary' | 'tertiary' | 'quaternary' | 'destructive' = 'primary';
  @Output() buttonClick = new EventEmitter<void>();

  // secondary button
  @Input() showSecondaryButton = false;
  @Input() secondaryLabel = '';
  @Input() secondaryButtonVariant: 'primary' | 'secondary' | 'tertiary' | 'quaternary' | 'destructive' = 'tertiary';
  @Output() secondaryClick = new EventEmitter<void>();

  // tags or type badges
  @Input() tags: string[] = [];

  // accessibility: compute aria label for button
  get buttonAriaLabel() {
    return `${this.buttonLabel} ${this.title || ''}`.trim();
  }

  get secondaryAriaLabel() {
    return `${this.secondaryLabel} ${this.title || ''}`.trim();
  }

  get sizeClass() {
    return `card--${this.size}`;
  }

  get borderClass() {
    return this.border === 'default' ? 'card--border' : this.border === 'dashed' ? 'card--dashed' : 'card--noborder';
  }

  onButtonClick() {
    this.buttonClick.emit();
  }

  onSecondaryClick() {
    this.secondaryClick.emit();
  }
}
