import { TitleCasePipe } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-post-type',
  imports: [TitleCasePipe],
  templateUrl: './post-type.component.html',
  styleUrl: './post-type.component.css'
})
export class PostTypeComponent {
  @Input() postType: string = "poem";
}
