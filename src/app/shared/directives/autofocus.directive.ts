import { AfterViewInit, Directive, ElementRef } from '@angular/core';

/**
 * Makes the native `autofocus` attribute work on elements rendered
 * dynamically (e.g. inside *ngIf modals), where browsers ignore it.
 */
@Directive({
  selector: '[autofocus]',
  standalone: true
})
export class AutofocusDirective implements AfterViewInit {
  constructor(private el: ElementRef<HTMLElement>) {}

  ngAfterViewInit(): void {
    setTimeout(() => this.el.nativeElement.focus(), 0);
  }
}
