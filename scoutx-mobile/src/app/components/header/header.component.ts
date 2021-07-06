import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { User } from '../../models/user';
import { Select } from '@ngxs/store';
import { AppState } from '../../store/app.state';
import { Observable } from 'rxjs';

@Component({
  selector: 'scoutx-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderComponent {
  @Select(AppState.user) user$: Observable<User>;
  @Input() title: string = "";

  constructor() { }

}
