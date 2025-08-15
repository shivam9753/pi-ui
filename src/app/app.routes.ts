import { Routes } from '@angular/router';
import { ExploreComponent } from './explore/explore.component';
import { AdminGuard } from './guards/admin.guard';
import { AuthGuard } from './guards/authguard';
import { ReviewerGuard } from './guards/reviewer.guard';
import { CanDeactivateGuard } from './guards/can-deactivate.guard';
import { SubmissionFormComponent } from './submit/submission-form/submission-form.component';
import { UserLoginComponent } from './user-login/user-login.component';
import { UserProfileComponent } from './user-profile/user-profile.component';
import { ReadingInterfaceComponent } from './reading-interface/reading-interface.component';
import { PromptsComponent } from './prompts/prompts.component';
import { AdminComponent } from './admin/admin.component';
import { PublishSubmissionComponent } from './admin/submissions/publish-submission/publish-submission.component';
import { ReviewSubmissionComponent } from './admin/submissions/review-submission/review-submission.component';
import { ProfileCompletionComponent } from './profile-completion/profile-completion.component';
import { EditSubmissionComponent } from './submit/edit-submission/edit-submission.component';
import { FaqsComponent } from './info/faqs/faqs.component';
import { ContactComponent } from './info/contact/contact.component';
import { PrivacyPolicyComponent } from './info/privacy-policy/privacy-policy.component';
import { TermsOfUseComponent } from './info/terms-of-use/terms-of-use.component';
import { PoemParserComponent } from './admin/poem-parser/poem-parser.component';
import { CategoryComponent } from './category/category.component';
import { TagComponent } from './tag/tag.component';
import { JsonConverterComponent } from './admin/json-converter/json-converter.component';
import { postSSRResolver } from './resolvers/post-ssr.resolver';

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
    path: 'user-profile/:id', 
    component: UserProfileComponent, 
    canActivate: [AuthGuard]
  },
  { 
    path: 'profile', 
    component: UserProfileComponent, 
    canActivate: [AuthGuard],
    title: 'My Profile - pi'
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
    path: 'submit', 
    component: SubmissionFormComponent, 
    canActivate: [AuthGuard],
    title: 'Submit Work - pi'
  },
  { 
    path: 'edit-submission/:id', 
    component: EditSubmissionComponent, 
    canActivate: [AuthGuard],
    title: 'Edit Submission - pi'
  },

  // Admin and Reviewer routes
  { 
    path: 'admin', 
    component: AdminComponent, 
    canActivate: [ReviewerGuard],
    title: 'Admin Dashboard'
  },
  
  // Legacy routes for backwards compatibility (redirect to admin with hash)
  { 
    path: 'review', 
    redirectTo: '/admin#review',
    pathMatch: 'full'
  },
  { 
    path: 'publish', 
    redirectTo: '/admin#publish',
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
    path: 'poem-parser', 
    component: PoemParserComponent,
    canActivate: [AdminGuard],
    title: 'Poem Parser - pi'
  },
  { 
    path: 'json-parser', 
    component: JsonConverterComponent,
    canActivate: [AdminGuard],
    title: 'JOSNß Parser - pi'
  },

  // Legacy route handler - redirect /:slug to /post/:slug
  { 
    path: ':slug', 
    redirectTo: (route) => {
      const slug = route.params['slug'];
      
      // Skip known application routes that aren't post slugs
      const knownRoutes = [
        'login', 'explore', 'submit', 'admin', 'profile', 'prompts',
        'faqs', 'contact-us', 'privacy-policy', 'terms-of-use',
        'complete-profile', 'review', 'publish', 'users', 'poem-parser', 'json-parser'
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
  { path: '**', redirectTo: '' }
];