# Published Content Card Component

A reusable Angular component for displaying published content cards (articles, poems, prose, etc.) with consistent styling and functionality across the application.

## Features

- **Responsive Design**: Works on mobile, tablet, and desktop
- **Flexible Sizing**: Small, medium, and large card sizes
- **Optional Stats**: Show view counts, likes, etc.
- **Hover Effects**: Smooth transitions and interactive states
- **Fallback Images**: Default placeholder when no image is available
- **Content Type Badges**: Visual indicators for different content types
- **Author Information**: Avatar, name, and publication date
- **Click Handling**: Emits events for navigation/interaction

## Usage

### Basic Implementation

```typescript
// In your component.ts file
import { PublishedContentCardComponent, PublishedContent } from '../utilities/published-content-card/published-content-card.component';

@Component({
  selector: 'app-your-component',
  imports: [PublishedContentCardComponent, /* other imports */],
  // ...
})
export class YourComponent {
  onCardClick(content: PublishedContent) {
    // Handle card click - navigate, open modal, etc.
    console.log('Card clicked:', content);
  }
}
```

```html
<!-- In your component.html file -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <app-published-content-card 
    *ngFor="let item of contentList"
    [content]="item"
    [showStats]="true"
    size="medium"
    (cardClick)="onCardClick($event)">
  </app-published-content-card>
</div>
```

## Properties

### Inputs

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `content` | `PublishedContent` | **Required** | The content object to display |
| `showStats` | `boolean` | `false` | Whether to show view counts, likes overlay |
| `size` | `'small' \| 'medium' \| 'large'` | `'medium'` | Card size variant |

### Outputs

| Event | Type | Description |
|-------|------|-------------|
| `cardClick` | `EventEmitter<PublishedContent>` | Emitted when card is clicked |

## Content Interface

```typescript
interface PublishedContent {
  _id?: string;
  title: string;
  excerpt?: string;
  description?: string;
  imageUrl?: string;
  submissionType: string;
  username?: string;
  author?: {
    username?: string;
  };
  createdAt: string;
  readingTime?: number;
  slug?: string;
  viewCount?: number;
  likeCount?: number;
}
```

## Size Variants

- **Small**: `h-32` - Compact cards for dense layouts
- **Medium**: `h-48` - Standard cards for most use cases  
- **Large**: `h-64` - Featured or hero cards

## Examples

### Explore Page (Public)
```html
<app-published-content-card 
  *ngFor="let submission of submissions"
  [content]="submission"
  [showStats]="false"
  size="medium"
  (cardClick)="openSubmission($event)">
</app-published-content-card>
```

### Admin Dashboard (With Stats)
```html
<app-published-content-card 
  *ngFor="let post of publishedPosts"
  [content]="post"
  [showStats]="true"
  size="small"
  (cardClick)="editPost($event)">
</app-published-content-card>
```

### Featured Content (Large)
```html
<app-published-content-card 
  [content]="featuredPost"
  [showStats]="true"
  size="large"
  (cardClick)="viewFeatured($event)">
</app-published-content-card>
```

## Styling

The component uses CSS classes that follow the application's theming system:

- `card` - Base card styling
- `bg-themed-card` - Theme-aware background
- `text-themed` - Theme-aware text colors
- `hover:shadow-lg` - Interactive hover effects

## Dependencies

- `BadgeLabelComponent` - For content type badges
- `CommonModule` - For Angular directives
- `DatePipe` - For date formatting

## Notes

- The component automatically handles missing author information
- Images have loading states and fallback placeholders
- All text content is sanitized for safe HTML rendering
- The card maintains accessibility with proper semantic markup