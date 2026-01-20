import { Routes } from '@angular/router';
import { ExploreComponent } from './main-explore/explore/explore.component';
import { AdminGuard } from './guards/admin.guard';
import { AuthGuard } from './guards/authguard';
import { ReviewerGuard } from './guards/reviewer.guard';
import { SubmissionEditorComponent } from './main-submission/submission-editor.component';
import { UserLoginComponent } from './user-login/user-login.component';
import { UserProfileComponent } from './main-user-profile/user-profile.component';
import { UserSubmissionsComponent } from './main-user-profile/user-submissions/user-submissions.component';
import { PromptsComponent } from './prompts/prompts.component';
import { AdminComponent } from './main-admin/admin.component';
import { WorkspaceComponent } from './main-workspace/workspace.component';
import { PublishSubmissionComponent } from './main-admin/submissions/publish-submission/publish-submission.component';
import { ReviewSubmissionComponent } from './main-admin/submissions/review-submission/review-submission.component';
import { ProfileCompletionComponent } from './main-user-profile/profile-completion/profile-completion.component';
import { FaqsComponent } from './info/faqs/faqs.component';
import { ContactComponent } from './info/contact/contact.component';
import { PrivacyPolicyComponent } from './info/privacy-policy/privacy-policy.component';
import { TermsOfUseComponent } from './info/terms-of-use/terms-of-use.component';
import { CategoryComponent } from './category/category.component';
import { TagComponent } from './tag/tag.component';
import { WhatsNewComponent } from './whats-new/whats-new.component';
import { postSSRResolver } from './resolvers/post-ssr.resolver';
import { AboutComponent } from './info/about/about.component';
import { SearchResultsComponent } from './search-results/search-results.component';
import { FeaturedPoemsComponent } from './main-featured/featured-poems/featured-poems.component';
import { NotFoundComponent } from './not-found/not-found.component';
import { ReadingInterfaceComponent } from './main-reading/reading-interface/reading-interface.component';
import { PublicAuthorProfileComponent } from './main-user-profile/public-author-profile/public-author-profile.component';
import { SimpleContentReaderComponent } from './main-reading/simple-content-reader/simple-content-reader.component';
import { ManageSubmissionsComponent } from './main-admin/content/manage-submissions/manage-submissions.component';
import { SubmissionsListComponent } from './main-user-profile/submissions-list/submissions-list.component';

export const routes: Routes = [
  // Public routes - Use explore as homepage for now
  { 
    path: '', 
    component: ExploreComponent, // This will show published content
    title: 'pi'
  },
  { 
    path: 'login', 
    component: UserLoginComponent,
    title: 'Login'
  },
  { 
    path: 'complete-profile', 
    component: ProfileCompletionComponent,
    canActivate: [AuthGuard],
    title: 'Complete Profile - pi'
  },
  { 
    path: 'explore', 
    component: ExploreComponent,
    title: 'Explore - pi'
  },
  { 
    path: 'search', 
    component: SearchResultsComponent,
    title: 'Search - pi'
  },
  { 
    path: 'category/:category', 
    component: CategoryComponent,
    title: 'Category - pi'
  },
  { 
    path: 'tag/:tag', 
    component: TagComponent,
    title: 'Tag - pi'
  },
  { 
    path: 'featured-poems', 
    component: FeaturedPoemsComponent,
    title: 'Featured Poems - pi'
  },
  { 
    path: 'author/:id', 
    component: PublicAuthorProfileComponent,
    title: 'Author Profile - pi'
  },
  { 
    path: 'user-profile/:id', 
    component: UserProfileComponent, 
    canActivate: [AuthGuard],
    title: 'User Profile - pi'
  },
  { 
    path: 'user-profile', 
    component: UserProfileComponent, 
    canActivate: [AuthGuard],
    title: 'My Profile - pi'
  },
  { 
    path: 'profile', 
    component: UserProfileComponent, 
    canActivate: [AuthGuard],
    title: 'My Profile - pi'
  },
  { 
    path: 'my-submissions', 
    component: UserSubmissionsComponent, 
    canActivate: [AuthGuard],
    title: 'My Submissions - pi'
  },
  // SSR-enabled reading interface route (primary)
  { 
    path: 'post/:slug', 
    component: ReadingInterfaceComponent,
    resolve: {
      postData: postSSRResolver
    },
    title: 'Post - pi'
  },
  { 
    path: 'content/:id', 
    component: SimpleContentReaderComponent,
    title: 'Content - pi'
  },
  // Legacy reading interface route (fallback for ID-based navigation)
  { 
    path: 'read/:id', 
    component: ReadingInterfaceComponent,
    title: 'Post - pi'
  },
  { 
    path: 'submission', 
    component: SubmissionEditorComponent, 
    canActivate: [AuthGuard],
    title: 'Submit Work - pi'
  },
  { 
    path: 'edit-submission/:id', 
    component: SubmissionEditorComponent, 
    canActivate: [AuthGuard],
    title: 'Edit Submission - pi'
  },

  // Admin and Reviewer routes
  // Dedicated submissions management route (allows reviewers/admins/writers)
  { 
    path: 'admin/submissions',
    component: ManageSubmissionsComponent,
    canActivate: [ReviewerGuard],
    title: 'Submissions - Admin'
  },
  { 
    path: 'admin', 
    component: AdminComponent, 
    canActivate: [AdminGuard],
    title: 'Admin Dashboard'
  },
  { 
    path: 'workspace', 
    component: WorkspaceComponent, 
    canActivate: [ReviewerGuard],
    title: 'Editorial Workspace'
  },
  
  // Legacy routes for backwards compatibility
  { 
    path: 'review', 
    redirectTo: '/workspace#review',
    pathMatch: 'full'
  },
  { 
    path: 'publish', 
    redirectTo: '/workspace#publish',
    pathMatch: 'full'
  },
  { 
    path: 'users', 
    redirectTo: '/admin#users',
    pathMatch: 'full'
  },
  { 
    path: 'prompts', 
    component: PromptsComponent, 
    title: 'Writing Prompts'
  },
  { 
    path: 'whats-new', 
    component: WhatsNewComponent, 
    title: 'What\'s New - pi'
  },
  { 
    path: 'review-submission/:id', 
    component: ReviewSubmissionComponent, 
    canActivate: [ReviewerGuard],
    title: 'Review Submission - pi'
  },
  { 
    path: 'publish-configure/:id', 
    component: PublishSubmissionComponent, 
    canActivate: [AdminGuard],
    title: 'Configure Publishing - pi'
  },
  { 
    path: 'faqs', 
    component: FaqsComponent,
    title: 'FAQs - pi'
  },
  { 
    path: 'contact-us', 
    component: ContactComponent,
    title: 'Contact - pi'
  },
  { 
    path: 'privacy-policy', 
    component: PrivacyPolicyComponent,
    title: 'Privacy Policy - pi'
  },
  { 
    path: 'terms-of-use', 
    component: TermsOfUseComponent,
    title: 'Contact - pi'
  },
  {
    path: 'about',
    component: AboutComponent,
    title: 'About - pi'
  },
  {
    path: 'not-found',
    component: NotFoundComponent,
    title: 'Page Not Found - pi'
  },
  { 
    path: 'submissions', 
    component: SubmissionsListComponent, 
    canActivate: [AuthGuard],
    title: 'Submissions - pi' 
  },
  { 
    path: 'published-authors', 
    loadComponent: () => import('./main-explore/published-authors/published-authors.component').then(m => m.PublishedAuthorsComponent),
    title: 'Authors - pi'
  },

  // Legacy route handler - redirect /:slug to /post/:slug
  { 
    path: ':slug', 
    redirectTo: (route) => {
      const slug = route.params['slug'];
      
      // Skip known application routes that aren't post slugs
      const knownRoutes = [
        'login', 'explore', 'search', 'submit', 'admin', 'workspace', 'studio', 'profile', 'prompts',
        'faqs', 'contact-us', 'privacy-policy', 'terms-of-use', 'whats-new',
        'complete-profile', 'review', 'publish', 'users', 'poem-parser', 'json-parser',
        'user-profile', 'about', 'not-found'
      ];
      
      if (slug && !knownRoutes.includes(slug)) {
        // This is likely a legacy post URL, redirect to new format
        return `/post/${slug}`;
      }
      
      // For known routes or invalid slugs, redirect to home
      return '/explore';
    }
  },

  // Fallback for unmatched routes
  { path: '**', redirectTo: '/not-found' }
];