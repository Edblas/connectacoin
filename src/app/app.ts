import { Component, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements AfterViewInit {

  ngAfterViewInit() {
    this.setupFAQ();
    this.setupSmoothScroll();
  }

  private setupFAQ() {
    const faqQuestions = document.querySelectorAll('.faq-question');
    faqQuestions.forEach(question => {
      question.addEventListener('click', () => {
        const answer = question.nextElementSibling as HTMLElement;
        const toggle = question.querySelector('.faq-toggle');
        const isActive = answer.classList.contains('active');
        
        document.querySelectorAll('.faq-answer.active').forEach(activeAnswer => {
          if (activeAnswer !== answer) {
            activeAnswer.classList.remove('active');
            (activeAnswer as HTMLElement).style.maxHeight = '0';
          }
        });
        document.querySelectorAll('.faq-toggle').forEach(t => {
          if (t !== toggle) {
            t.textContent = '+';
          }
        });

        if (isActive) {
          answer.classList.remove('active');
          answer.style.maxHeight = '0';
          if (toggle) toggle.textContent = '+';
        } else {
          answer.classList.add('active');
          answer.style.maxHeight = answer.scrollHeight + 'px';
          if (toggle) toggle.textContent = '−';
        }
      });
    });
  }

  private setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = anchor.getAttribute('href');
        if (targetId) {
          const target = document.querySelector(targetId);
          if (target) {
            target.scrollIntoView({
              behavior: 'smooth',
              block: 'start'
            });
          }
        }
      });
    });
  }
}
