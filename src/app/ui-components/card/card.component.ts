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
  @Input() imageSrc?: string;
  @Input() imagePosition: 'top' | 'bottom' | 'none' = 'top';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() border: 'default' | 'none' = 'default';

  // Primary action — when empty, no primary button is shown
  @Input() primaryButtonLabel = '';
  @Input() primaryButtonVariant: 'primary' | 'secondary' | 'tertiary' | 'quaternary' | 'destructive' = 'primary';
  @Output() primaryClick = new EventEmitter<void>();

  // Secondary action — when empty, no secondary button is shown
  @Input() secondaryButtonLabel = '';
  @Input() secondaryButtonVariant: 'primary' | 'secondary' | 'tertiary' | 'quaternary' | 'destructive' = 'tertiary';
  @Output() secondaryClick = new EventEmitter<void>();

  // Badges (primary and secondary) — optional
  @Input() primaryBadgeText?: string;
  @Input() primaryBadgeType?: string;
  @Input() primaryBadgeVariant?: 'soft' | 'solid' | 'outline' | 'big-red';

  @Input() secondaryBadgeText?: string;
  @Input() secondaryBadgeType?: string;
  @Input() secondaryBadgeVariant?: 'soft' | 'solid' | 'outline' | 'big-red';

  // Optional small date to show in the subhead. Accepts a string or Date.
  @Input() date?: string | Date;

  // Formatted date for display: dd-mm-yy (e.g. 17-01-26)
  get formattedDate(): string | undefined {
    if (!this.date) return undefined;
    const d = this.date instanceof Date ? this.date : new Date(String(this.date));
    if (Number.isNaN(d.getTime())) return String(this.date);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}-${mm}-${yy}`;
  }

  // ISO string used for datetime attribute (if date is valid)
  get dateIso(): string | undefined {
    if (!this.date) return undefined;
    const d = this.date instanceof Date ? this.date : new Date(String(this.date));
    if (Number.isNaN(d.getTime())) return undefined;
    return d.toISOString();
  }

  // accessibility: compute aria label for buttons
  get primaryAriaLabel() {
    return `${this.primaryButtonLabel} ${this.title || ''}`.trim();
  }

  get secondaryAriaLabel() {
    return `${this.secondaryButtonLabel} ${this.title || ''}`.trim();
  }

  get sizeClass() {
    return `card--${this.size}`;
  }

  get borderClass() {
    if (this.border === 'default') return 'card--border';
    return 'card--noborder';
  }

  onPrimaryClick() {
    this.primaryClick.emit();
  }

  onSecondaryClick() {
    this.secondaryClick.emit();
  }

  // Helpers used by template to decide whether to render buttons
  get showPrimaryButton() { return !!this.primaryButtonLabel; }
  get showSecondaryButton() { return !!this.secondaryButtonLabel; }
}
