import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export type TypographyVariant = 
  | 'heading-1' 
  | 'heading-2' 
  | 'heading-3' 
  | 'heading-4' 
  | 'body-lg' 
  | 'body' 
  | 'body-sm' 
  | 'caption';

export type TypographyColor = 
  | 'primary' 
  | 'secondary' 
  | 'tertiary' 
  | 'inverse' 
  | 'brand' 
  | 'success' 
  | 'warning' 
  | 'error' 
  | 'info';

export type TypographyAlign = 'left' | 'center' | 'right' | 'justify';

@Component({
  selector: 'pi-text',
  standalone: true,
  imports: [CommonModule],
  template: `
    <ng-container [ngSwitch]="element">
      <h1 *ngSwitchCase="'h1'" [class]="textClasses" [style.text-align]="align">
        <ng-content></ng-content>
      </h1>
      <h2 *ngSwitchCase="'h2'" [class]="textClasses" [style.text-align]="align">
        <ng-content></ng-content>
      </h2>
      <h3 *ngSwitchCase="'h3'" [class]="textClasses" [style.text-align]="align">
        <ng-content></ng-content>
      </h3>
      <h4 *ngSwitchCase="'h4'" [class]="textClasses" [style.text-align]="align">
        <ng-content></ng-content>
      </h4>
      <h5 *ngSwitchCase="'h5'" [class]="textClasses" [style.text-align]="align">
        <ng-content></ng-content>
      </h5>
      <h6 *ngSwitchCase="'h6'" [class]="textClasses" [style.text-align]="align">
        <ng-content></ng-content>
      </h6>
      <p *ngSwitchCase="'p'" [class]="textClasses" [style.text-align]="align">
        <ng-content></ng-content>
      </p>
      <span *ngSwitchCase="'span'" [class]="textClasses" [style.text-align]="align">
        <ng-content></ng-content>
      </span>
      <div *ngSwitchDefault [class]="textClasses" [style.text-align]="align">
        <ng-content></ng-content>
      </div>
    </ng-container>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TypographyComponent {
  @Input() variant: TypographyVariant = 'body';
  @Input() color: TypographyColor = 'primary';
  @Input() element: string = 'div';
  @Input() align: TypographyAlign = 'left';
  @Input() truncate = false;
  @Input() noMargin = false;

  get textClasses(): string {
    const classes = [`pi-${this.variant}`];
    
    // Color
    if (this.color !== 'primary') {
      classes.push(`pi-text-${this.color}`);
    }
    
    // Modifiers
    if (this.truncate) classes.push('pi-text-truncate');
    if (this.noMargin) classes.push('pi-text-no-margin');
    
    return classes.join(' ');
  }
}

// Convenience components for specific use cases
@Component({
  selector: 'pi-heading',
  standalone: true,
  imports: [CommonModule, TypographyComponent],
  template: `
    <pi-text 
      [variant]="getHeadingVariant()" 
      [element]="element || getDefaultElement()"
      [color]="color"
      [align]="align"
      [truncate]="truncate"
      [noMargin]="noMargin">
      <ng-content></ng-content>
    </pi-text>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeadingComponent {
  @Input() level: 1 | 2 | 3 | 4 = 1;
  @Input() color: TypographyColor = 'primary';
  @Input() element?: string;
  @Input() align: TypographyAlign = 'left';
  @Input() truncate = false;
  @Input() noMargin = false;

  getHeadingVariant(): TypographyVariant {
    return `heading-${this.level}` as TypographyVariant;
  }

  getDefaultElement(): string {
    return `h${this.level}`;
  }
}

@Component({
  selector: 'pi-body',
  standalone: true,
  imports: [CommonModule, TypographyComponent],
  template: `
    <pi-text 
      [variant]="size" 
      [element]="element || 'p'"
      [color]="color"
      [align]="align"
      [truncate]="truncate"
      [noMargin]="noMargin">
      <ng-content></ng-content>
    </pi-text>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BodyComponent {
  @Input() size: 'body-lg' | 'body' | 'body-sm' = 'body';
  @Input() color: TypographyColor = 'primary';
  @Input() element?: string;
  @Input() align: TypographyAlign = 'left';
  @Input() truncate = false;
  @Input() noMargin = false;
}