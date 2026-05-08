import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { initAutomergeWasm } from './app/services/automerge-init';

// Initialize Automerge WASM before bootstrapping Angular
initAutomergeWasm()
  .then(() => bootstrapApplication(AppComponent, appConfig))
  .catch((err) => console.error(err));
