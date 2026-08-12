import { Component, AfterViewInit } from '@angular/core';

@Component({
  selector: 'app-help',
  standalone: true,
  templateUrl: './help.html',
  styleUrls: ['./help.scss']
})
export class Help implements AfterViewInit {

  ngAfterViewInit() {
    this.setupFAQ();
  }

  setupFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
      const question = item.querySelector('.faq-question') as HTMLElement;
      if (question) {
        question.addEventListener('click', () => {
          item.classList.toggle('open');
        });
      }
    });
  }
}
