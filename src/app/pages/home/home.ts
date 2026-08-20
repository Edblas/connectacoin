import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, TranslateModule],
  templateUrl: './home.html',
  styleUrls: ['./home.scss']
})
export class Home {}
