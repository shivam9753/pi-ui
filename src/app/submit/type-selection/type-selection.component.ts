import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
export interface SubmissionType {
  label: string;
  value: string;
  description: string;
  icon: string;
}
@Component({
  selector: 'app-type-selection',
  imports: [CommonModule],
  templateUrl: './type-selection.component.html',
  styleUrl: './type-selection.component.css'
})
export class TypeSelectionComponent {
  @Input() submissionTypes: SubmissionType[] = [];
  @Input() selectedType: string = '';
  @Input() description: string = '';
  
  @Output() typeSelected = new EventEmitter<string>();
  @Output() descriptionChanged = new EventEmitter<string>();
  @Output() nextStep = new EventEmitter<void>();

  selectType(type: string): void {
    this.typeSelected.emit(type);
  }

  updateDescription(event: any): void {
    this.descriptionChanged.emit(event.target.value);
  }

  continue(): void {
    if (this.selectedType) {
      this.nextStep.emit();
    }
  }
}
