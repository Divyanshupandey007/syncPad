import { Routes } from '@angular/router';
import { EditorComponent } from './components/editor/editor.component';

export const routes: Routes = [
  // When a user visits /{documentId}, load the editor for that document
  { path: ':documentId', component: EditorComponent },

  // Default: redirect to a random document ID
  { path: '', redirectTo: generateDocId(), pathMatch: 'full' },
];

/** Generate a short random document ID for new visitors */
function generateDocId(): string {
  return Math.random().toString(36).substring(2, 8);
}
