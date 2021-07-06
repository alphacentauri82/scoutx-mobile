import { Component } from '@angular/core';
import { AuthenticationService } from '../services/authentication.service';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
})
export class TabsPage {

  constructor(private authService: AuthenticationService) {}

  logout() {
    this.authService.signOut();
  }
}
