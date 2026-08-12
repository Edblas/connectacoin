import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, interval, Subject, takeUntil, catchError, of, tap } from 'rxjs';

export interface TokenPrice {
  priceUsd: string | null;
  priceBtc: string | null;
  change24h: number | null;
  volume24h: string | null;
  marketCapUsd: string | null;
  lastUpdated: Date | null;
  loading: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class TokenPriceService implements OnDestroy {

  private readonly API_URL = 'https://api.geckoterminal.com/api/v2/networks/polygon_pos/tokens/0xcf813748c978d7d2bf8d5eae8ba09d43fd2d23e9';

  private readonly destroy$ = new Subject<void>();

  private readonly priceSubject$ = new BehaviorSubject<TokenPrice>({
    priceUsd: null,
    priceBtc: null,
    change24h: null,
    volume24h: null,
    marketCapUsd: null,
    lastUpdated: null,
    loading: true,
    error: null
  });

  public readonly price$ = this.priceSubject$.asObservable();

  constructor(private http: HttpClient) {
    this.fetchPrice();
    interval(30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.fetchPrice());
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private fetchPrice() {
    const current = this.priceSubject$.value;
    this.priceSubject$.next({ ...current, loading: true, error: null });

    this.http.get<any>(this.API_URL)
      .pipe(
        tap(() => {}),
        catchError(err => {
          console.error('Erro ao buscar preço do token:', err);
          this.priceSubject$.next({
            ...current,
            loading: false,
            error: 'Não foi possível carregar o preço no momento. Tente novamente em instantes.'
          });
          return of(null);
        })
      )
      .subscribe(data => {
        if (!data || !data.data || !data.data.attributes) {
          if (!this.priceSubject$.value.error) {
            this.priceSubject$.next({
              ...current,
              loading: false,
              error: 'Dados do token não disponíveis no momento.'
            });
          }
          return;
        }

        const attr = data.data.attributes;
        this.priceSubject$.next({
          priceUsd: attr.price_usd ?? null,
          priceBtc: attr.price_btc ?? null,
          change24h: attr.price_change_percentage_24h ?? null,
          volume24h: attr.volume_usd_24h ?? null,
          marketCapUsd: attr.fdv ?? null,
          lastUpdated: new Date(),
          loading: false,
          error: null
        });
      });
  }

  public refresh() {
    this.fetchPrice();
  }
}
