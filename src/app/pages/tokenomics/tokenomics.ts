import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { TokenPriceService, TokenPrice } from '../../services/token-price.service';

@Component({
  selector: 'app-tokenomics',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './tokenomics.html',
  styleUrls: ['./tokenomics.scss']
})
export class TokenomicsPage implements OnInit, OnDestroy {

  private readonly destroy$ = new Subject<void>();

  price: TokenPrice = {
    priceUsd: null,
    priceBtc: null,
    change24h: null,
    volume24h: null,
    marketCapUsd: null,
    lastUpdated: null,
    loading: true,
    error: null
  };

  get isPositive(): boolean {
    if (this.price.change24h === null || this.price.change24h === undefined) return true;
    return this.price.change24h >= 0;
  }

  constructor(
    private readonly tokenPriceService: TokenPriceService,
    private readonly translate: TranslateService
  ) {}

  ngOnInit() {
    this.tokenPriceService.price$
      .pipe(takeUntil(this.destroy$))
      .subscribe(price => {
        const translated: TokenPrice = { ...price };
        if (price.error) {
          const loadingErrKey = 'TOKENOMICS.LOADING_ERROR';
          const dataUnKey = 'TOKENOMICS.DATA_UNAVAILABLE';
          if (price.error.includes('Não foi possível') || price.error.includes('Could not load')) {
            translated.error = this.translate.instant(loadingErrKey);
          } else {
            translated.error = this.translate.instant(dataUnKey);
          }
        }
        this.price = translated;
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  refreshPrice() {
    this.tokenPriceService.refresh();
  }

  private getLocale(): string {
    const curr: string = (this.translate.currentLang as unknown as string) || 'pt';
    return curr === 'pt' ? 'pt-BR' : 'en-US';
  }

  formatNumber(value: string | number | null): string {
    if (value === null || value === undefined) return '0.00';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    const locale = this.getLocale();
    if (isNaN(num)) return '0.00';
    if (num === 0) return '0.00';
    if (num < 0.0001) return num.toExponential(4);
    if (num < 1) return num.toFixed(8).replace(/\.?0+$/, '');
    if (num < 1000) return num.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return num.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  formatChange(value: number | null): string {
    if (value === null || value === undefined || isNaN(value)) return '0.00';
    const abs = Math.abs(value);
    const locale = this.getLocale();
    if (abs < 0.01) return '0.00';
    return abs.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  formatCompact(value: string | number | null): string {
    if (value === null || value === undefined) return '-';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '-';
    if (num === 0) return '0';
    const abs = Math.abs(num);
    const sign = num < 0 ? '-' : '';
    if (abs >= 1e12) return sign + (abs / 1e12).toFixed(2) + 'T';
    if (abs >= 1e9) return sign + (abs / 1e9).toFixed(2) + 'B';
    if (abs >= 1e6) return sign + (abs / 1e6).toFixed(2) + 'M';
    if (abs >= 1e3) return sign + (abs / 1e3).toFixed(2) + 'K';
    return sign + abs.toFixed(abs < 1 ? 4 : 2);
  }

  formatDate(date: Date | null): string {
    if (!date) return '-';
    try {
      const locale = this.getLocale();
      return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '-';
    }
  }
}
