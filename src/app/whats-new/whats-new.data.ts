export interface WhatsNewItem {
  id: string;
  title: string;
  description: string;
  type: 'Feature' | 'Defect';
  link: string;
  dateAdded: string;
}

export const WHATS_NEW_DATA: WhatsNewItem[] = [
  {
    "id": "1",
    "title": "Submit and Track Your Submissions",
    "description": "Start by submitting your creative work - poetry, articles, or opinion pieces. Then track their progress through our review process directly from your profile page. See real-time status updates as your submissions move from draft to review to publication.",
    "type": "Feature",
    "link": "/submission",
    "dateAdded": "2025-01-15"
  },
  {
    "id": "2", 
    "title": "Quick Opinion Piece Reviews",
    "description": "Submit opinion pieces which receive expedited reviews. These thought-provoking pieces get quick turnaround times for faster feedback and potential publication. Perfect for timely commentary and personal perspectives.",
    "type": "Feature",
    "link": "/submission",
    "dateAdded": "2025-01-10"
  },
  {
    "id": "3",
    "title": "Manage Your Private Profile", 
    "description": "Update your profile picture, bio, and personal information to showcase your work and connect with readers. Customize how you appear to the community while maintaining control over your privacy settings.",
    "type": "Feature",
    "link": "/profile",
    "dateAdded": "2025-01-08"
  },
  {
    "id": "4",
    "title": "Save Drafts Feature",
    "description": "Never lose your creative work again! Your submissions are automatically saved as drafts while you write. Return anytime to continue editing and perfecting your pieces before submission.",
    "type": "Feature", 
    "link": "/submission",
    "dateAdded": "2025-01-05"
  },
  {
    "id": "5",
    "title": "Popular This Week",
    "description": "See the popular posts in 'Popular This Week' - discover content that's getting the most traction and engagement from our community of readers. Stay updated with what's resonating right now.",
    "type": "Feature",
    "link": "/explore",
    "dateAdded": "2025-01-03"
  },
  {
    "id": "6",
    "title": "See Trending Tags",
    "description": "Explore trending topics and tags to discover what themes and subjects are currently popular. Use these insights to connect your work with trending conversations and reach more readers.",
    "type": "Feature",
    "link": "/explore", 
    "dateAdded": "2025-01-01"
  }
];