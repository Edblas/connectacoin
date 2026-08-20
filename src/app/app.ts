import { Component, OnInit, HostListener } from '@angular/core';
import { RouterOutlet, RouterModule, NavigationEnd, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslateService, TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterModule, CommonModule, TranslateModule],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class AppComponent implements OnInit {

  currentLang: string = 'pt';
  menuOpen: boolean = false;

  constructor(private translate: TranslateService, private router: Router) {}

  ngOnInit(): void {
    const savedLang = typeof localStorage !== 'undefined' ? localStorage.getItem('cnta-lang') : null;
    const initialLang = savedLang && (savedLang === 'pt' || savedLang === 'en') ? savedLang : 'pt';
    this.currentLang = initialLang;
    this.translate.setDefaultLang('pt');
    this.translate.use(initialLang);

    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.menuOpen = false;
      }
    });
  }

  toggleMobileMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  closeMobileMenu(): void {
    this.menuOpen = false;
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event): void {
    if (window.innerWidth > 768) {
      this.menuOpen = false;
    }
  }

  switchLang(lang: 'pt' | 'en') {
    if (lang === this.currentLang) return;
    this.currentLang = lang;
    this.translate.use(lang);
    try {
      localStorage.setItem('cnta-lang', lang);
    } catch (e) {}
  }

  setupFAQ() {
    setTimeout(() => {
      const details = document.querySelectorAll('details.faq-item');
      details.forEach(d => {
        d.addEventListener('toggle', () => {
          if ((d as HTMLDetailsElement).open) {
            details.forEach(other => {
              if (other !== d) (other as HTMLDetailsElement).open = false;
            });
          }
        });
      });
    }, 100);
  }

  setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', (e) => {
        const href = (anchor as HTMLAnchorElement).getAttribute('href');
        if (!href || href === '#') return;
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          (target as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }
}
