import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { Subject } from 'rxjs';
import { fromEvent, Subscription } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css'],
})
export class FooterComponent implements OnInit, OnDestroy {
  currentYear = new Date().getFullYear();
  showFooter = false;
  private destroy$ = new Subject<void>();
  private homeScrollSub: Subscription | null = null;

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Check initial route
    this.updateFooterVisibility();

    // Listen to route changes and update footer visibility
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntil(this.destroy$),
      )
      .subscribe(() => {
        this.updateFooterVisibility();
      });
  }

  ngOnDestroy(): void {
    this.detachHomeScroll();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateFooterVisibility(): void {
    const isHome = this.router.url === '/' || this.router.url.startsWith('/home');
    if (!isHome) {
      this.detachHomeScroll();
      this.showFooter = false;
      return;
    }

    this.attachHomeScroll();
    this.updateFromHomeScrollPosition();
  }

  private attachHomeScroll(): void {
    if (this.homeScrollSub) return;
    const container = this.getHomeContainer();
    if (!container) {
      setTimeout(() => this.updateFooterVisibility(), 0);
      return;
    }

    this.homeScrollSub = fromEvent(container, 'scroll')
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.updateFromHomeScrollPosition());
  }

  private detachHomeScroll(): void {
    this.homeScrollSub?.unsubscribe();
    this.homeScrollSub = null;
  }

  private updateFromHomeScrollPosition(): void {
    const container = this.getHomeContainer();
    if (!container) {
      this.showFooter = false;
      return;
    }
    const threshold = 8;
    const atBottom =
      container.scrollTop + container.clientHeight >= container.scrollHeight - threshold;
    this.showFooter = atBottom;
  }

  private getHomeContainer(): HTMLElement | null {
    if (typeof document === 'undefined') return null;
    return document.querySelector('.home-container');
  }
}
