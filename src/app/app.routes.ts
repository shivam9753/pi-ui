import { Routes } from '@angular/router';
import { ExploreComponent } from './explore/explore.component';
import { AdminGuard } from './guards/admin.guard';
import { AuthGuard } from './guards/authguard';
import { ReviewerGuard } from './guards/reviewer.guard';
import { HomepageComponent } from './homepage/homepage.component';
import { ReviewSubmissionComponent } from './review-sub/review-submission/review-submission.component';
import { ReviewCpomponent } from './review-sub/review/review.component';
import { SubmissionFormComponent } from './submission-form/submission-form.component';
import { UserLoginComponent } from './user-login/user-login.component';
import { PostScreenComponent } from './post-screen/post-screen.component';
import { UserProfileComponent } from './user-profile/user-profile.component';
import { ReadingInterfaceComponent } from './reading-interface/reading-interface.component';
import { ExploreByTypeComponent } from './explore-by-type/explore-by-type.component';

export const routes: Routes = [
  // Public routes - Use explore as homepage for now
  { 
    path: '', 
    component: ExploreComponent, // This will show published content
    title: 'Mosaic - Literary Community'
  },
  { 
    path: 'login', 
    component: UserLoginComponent,
    title: 'Login - Mosaic'
  },
  { 
    path: 'explore', 
    component: ExploreComponent,
    title: 'Explore - Mosaic'
  },
  { 
    path: 'user-profile/:id', 
    component: UserProfileComponent, 
    canActivate: [AuthGuard]
  },
  { path: 'read/:id', component: ReadingInterfaceComponent },
  { 
    path: 'submit', 
    component: SubmissionFormComponent, 
    canActivate: [AuthGuard],
    title: 'Submit Work - Mosaic'
  },
  { 
    path: 'read-post/:id', 
    component: PostScreenComponent,
    title: 'Read - Mosaic'
  },

  // Reviewer routes
  { 
    path: 'review', 
    component: ReviewCpomponent, 
    canActivate: [ReviewerGuard],
    title: 'Review Submissions - Mosaic'
  },
  { 
    path: 'review-submission/:id', 
    component: ReviewSubmissionComponent, 
    canActivate: [ReviewerGuard],
    title: 'Review Submission - Mosaic'
  },

  
  { 
    path: 'browse/:type', 
    component: ExploreByTypeComponent,
    data: { title: 'Browse' }
  },

  // Fallback
  { path: '**', redirectTo: '' }
];