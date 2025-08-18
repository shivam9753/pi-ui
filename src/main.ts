import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { DevValidation } from './app/shared/utils/validation.utils';

// Initialize development validation
DevValidation.initializeDevelopmentChecks();

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
