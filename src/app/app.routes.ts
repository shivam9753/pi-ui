import { Routes } from '@angular/router';
import { ExploreComponent } from './explore/explore.component';
import { AdminGuard } from './guards/admin.guard';
import { AuthGuard } from './guards/authguard';
import { ReviewerGuard } from './guards/reviewer.guard';
import { HomepageComponent } from './homepage/homepage.component';
import { ReviewSubmissionComponent } from './review-sub/review-submission/review-submission.component';
import { ReviewCpomponent } from './review-sub/review/review.component';
import { SubmissionFormComponent } from './submission-form/submission-form.component';
import { UserListComponent } from './user-list/user-list.component';
import { UserLoginComponent } from './user-login/user-login.component';

export const routes: Routes = [
    { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: UserLoginComponent },
  { 
    path: 'dashboard', component: HomepageComponent, canActivate: [AuthGuard]
  },
  { 
    path: 'explore', component: ExploreComponent, canActivate: [AuthGuard]
  },
  { 
    path: 'user-list', component: UserListComponent, canActivate: [AdminGuard]
  },
  { 
    path: 'review', component: ReviewCpomponent, canActivate: [ReviewerGuard]
  },
  { 
    path: 'submit', component: SubmissionFormComponent, canActivate: [AuthGuard]
  },
  {path: 'review-submission/:id',component: ReviewSubmissionComponent, canActivate: [AuthGuard]},
  { path: '**', redirectTo: '/login' }
];
