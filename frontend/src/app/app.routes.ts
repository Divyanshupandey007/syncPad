import { Routes } from '@angular/router';
import { EditorComponent } from './components/editor/editor.component';

export const routes: Routes = [
  { path: ':documentId', component: EditorComponent },
  { path: '', redirectTo: generateDocId(), pathMatch: 'full' },
];

function generateDocId(): string {
  return Math.random().toString(36).substring(2, 8);
}
