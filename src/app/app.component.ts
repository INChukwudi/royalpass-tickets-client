import { AfterViewInit, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

declare const AOS: { init(options: Record<string, unknown>): void } | undefined;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements AfterViewInit {
  ngAfterViewInit(): void {
    if (typeof AOS !== 'undefined')
      AOS.init({ duration: 800, easing: 'ease-out-cubic', once: true, offset: 60 });
  }
}
