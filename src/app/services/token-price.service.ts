import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, interval, Subject, takeUntil, catchError, of, tap, timeout, firstValueFrom } from 'rxjs';

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

interface GeckoTokenAttrs {
  price_usd?: unknown;
  token_price_usd?: unknown;
  base_token_price_usd?: unknown;
  price_btc?: unknown;
  price_change_percentage_24h?: unknown;
  total_reserve_in_usd?: unknown;
  reserve_in_usd?: unknown;
  normalized_total_supply?: unknown;
  fdv_usd?: unknown;
  fdv?: unknown;
  market_cap_usd?: unknown;
  volume_usd?: { h24?: unknown } | unknown;
  volume_usd_24h?: unknown;
  price_change_percentage?: { h24?: unknown };
}

interface DexScreenerPair {
  priceUsd?: string;
  priceChange?: { h24?: number };
  volume?: { h24?: number };
  fdv?: number;
  marketCap?: number;
}

@Injectable({
  providedIn: 'root'
})
export class TokenPriceService implements OnDestroy {

  private readonly POOL_ADDRESS = '0xe97736e1f51b7d7b6852a08b37eefa1779eee8e51a652db17f2301df9391a448';
  private readonly PRIMARY_API = `https://api.geckoterminal.com/api/v2/networks/polygon_pos/pools/${this.POOL_ADDRESS}`;
  private readonly SECONDARY_API = 'https://api.geckoterminal.com/api/v2/networks/polygon_pos/tokens/0xcf813748c978d7d2bf8d5eae8ba09d43fd2d23e9/pools';
  private readonly LEGACY_TOKEN_API = 'https://api.geckoterminal.com/api/v2/networks/polygon_pos/tokens/0xcf813748c978d7d2bf8d5eae8ba09d43fd2d23e9';
  private readonly FALLBACK_API = 'https://api.dexscreener.com/latest/dex/tokens/0xcf813748c978d7d2bf8d5eae8ba09d43fd2d23e9';
  private readonly CONTRACT = '0xcf813748c978d7d2bf8d5eae8ba09d43fd2d23e9';

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

  private toNumber(value: unknown): number {
    if (value === null || value === undefined) return 0;
    const n = typeof value === 'number' ? value : parseFloat(String(value));
    return isNaN(n) ? 0 : n;
  }

  private async fetchPrice() {
    const current = this.priceSubject$.value;
    this.priceSubject$.next({ ...current, loading: true, error: null });

    try {
      const fromPrimary = await firstValueFrom(
        this.http.get<any>(this.PRIMARY_API).pipe(
          timeout(12000),
          catchError((err: HttpErrorResponse) => {
            console.warn('[TokenPrice] Primary Pool Gecko falhou:', err?.status || err?.message);
            return of(null);
          })
        )
      );

      let result = this.parseFromGeckoPool(fromPrimary);
      if (!result) {
        const fromSecondary = await firstValueFrom(
          this.http.get<any>(this.SECONDARY_API).pipe(
            timeout(12000),
            catchError(() => of(null))
          )
        );
        result = this.parseFromGeckoPoolsList(fromSecondary);
      }
      if (!result) {
        const fromLegacy = await firstValueFrom(
          this.http.get<any>(this.LEGACY_TOKEN_API).pipe(
            timeout(12000),
            catchError(() => of(null))
          )
        );
        result = this.parseFromGeckoTerminal(fromLegacy);
      }
      if (!result) {
        const fromFallback = await firstValueFrom(
          this.http.get<any>(this.FALLBACK_API).pipe(
            timeout(12000),
            catchError(() => of(null))
          )
        );
        result = this.parseFromDexScreener(fromFallback);
      }

      if (result) {
        this.priceSubject$.next({ ...result, loading: false, error: null });
      } else {
        this.priceSubject$.next({
          ...current,
          loading: false,
          error: 'Não foi possível carregar o preço no momento. Tente novamente em instantes.'
        });
      }
    } catch (err) {
      console.error('[TokenPrice] Erro fatal ao buscar preço:', err);
      this.priceSubject$.next({
        ...current,
        loading: false,
        error: 'Não foi possível carregar o preço no momento. Tente novamente em instantes.'
      });
    }
  }

  private parseFromGeckoTerminal(data: any): TokenPrice | null {
    if (!data || !data.data || !data.data.attributes) return null;
    const attr: GeckoTokenAttrs = data.data.attributes;

    const rawPrice = attr.price_usd;
    const reserve = this.toNumber(attr.total_reserve_in_usd);
    const supply = this.toNumber(attr.normalized_total_supply);
    let priceUsd = rawPrice;
    if ((priceUsd === null || priceUsd === undefined || String(priceUsd) === 'null' || this.toNumber(priceUsd) === 0) && reserve > 0 && supply > 0) {
      priceUsd = String(reserve / supply);
    }

    const volume24hRaw =
      (attr.volume_usd && typeof attr.volume_usd === 'object' && (attr.volume_usd as any).h24 !== undefined && (attr.volume_usd as any).h24 !== null)
        ? (attr.volume_usd as any).h24
        : attr.volume_usd_24h;
    const volume24h = volume24hRaw !== undefined && volume24hRaw !== null ? String(volume24hRaw) : null;

    const rawFdv = attr.fdv_usd ?? attr.fdv;
    const rawMarketCap = attr.market_cap_usd ?? rawFdv;
    const priceNum = this.toNumber(priceUsd);
    let marketCapUsd = rawMarketCap;
    if ((marketCapUsd === null || marketCapUsd === undefined || String(marketCapUsd) === 'null') && priceNum > 0 && supply > 0) {
      marketCapUsd = String(priceNum * supply);
    }

    const change24hRaw = attr.price_change_percentage_24h;
    const change24h = (change24hRaw === undefined || change24hRaw === null || String(change24hRaw) === 'null')
      ? null
      : this.toNumber(change24hRaw);

    return {
      priceUsd: priceUsd !== undefined && priceUsd !== null && String(priceUsd) !== 'null' ? String(priceUsd) : null,
      priceBtc: attr.price_btc !== undefined && attr.price_btc !== null ? String(attr.price_btc) : null,
      change24h,
      volume24h,
      marketCapUsd: marketCapUsd !== undefined && marketCapUsd !== null && String(marketCapUsd) !== 'null' ? String(marketCapUsd) : null,
      lastUpdated: new Date(),
      loading: false,
      error: null
    };
  }

  private parseFromGeckoPool(data: any): TokenPrice | null {
    if (!data || !data.data || !data.data.attributes) return null;
    const attr: GeckoTokenAttrs = data.data.attributes;
    return this.buildFromPoolAttrs(attr);
  }

  private parseFromGeckoPoolsList(data: any): TokenPrice | null {
    if (!data || !data.data || !Array.isArray(data.data) || data.data.length === 0) return null;
    const first = data.data.find((p: any) => p?.attributes?.address?.toLowerCase() === this.POOL_ADDRESS.toLowerCase()) ?? data.data[0];
    if (!first || !first.attributes) return null;
    return this.buildFromPoolAttrs(first.attributes as GeckoTokenAttrs);
  }

  private buildFromPoolAttrs(attr: GeckoTokenAttrs): TokenPrice | null {
    const rawPrice = attr.base_token_price_usd ?? attr.token_price_usd ?? attr.price_usd;
    const reserve = this.toNumber(attr.reserve_in_usd ?? attr.total_reserve_in_usd);
    const supply = this.toNumber(attr.normalized_total_supply) || 100_000_000;

    let priceUsd = rawPrice;
    if ((priceUsd === null || priceUsd === undefined || String(priceUsd) === 'null' || this.toNumber(priceUsd) === 0) && reserve > 0 && supply > 0) {
      priceUsd = String(reserve / supply);
    }

    const priceNum = this.toNumber(priceUsd);
    if (priceNum <= 0) return null;

    const volume24hRaw =
      (attr.volume_usd && typeof attr.volume_usd === 'object' && (attr.volume_usd as any).h24 !== undefined && (attr.volume_usd as any).h24 !== null)
        ? (attr.volume_usd as any).h24
        : attr.volume_usd_24h;
    const volume24h = volume24hRaw !== undefined && volume24hRaw !== null ? String(volume24hRaw) : null;

    const changeObj = attr.price_change_percentage;
    const change24hRaw = (changeObj && typeof changeObj === 'object' && (changeObj as any).h24 !== undefined)
      ? (changeObj as any).h24
      : attr.price_change_percentage_24h;
    const change24h = (change24hRaw === undefined || change24hRaw === null || String(change24hRaw) === 'null')
      ? null
      : this.toNumber(change24hRaw);

    const rawFdv = attr.fdv_usd ?? attr.fdv;
    const rawMarketCap = attr.market_cap_usd ?? rawFdv;
    let marketCapUsd = rawMarketCap;
    if ((marketCapUsd === null || marketCapUsd === undefined || String(marketCapUsd) === 'null' || this.toNumber(marketCapUsd) === 0) && priceNum > 0 && supply > 0) {
      marketCapUsd = String(priceNum * supply);
    }

    return {
      priceUsd: String(priceUsd),
      priceBtc: attr.price_btc !== undefined && attr.price_btc !== null ? String(attr.price_btc) : null,
      change24h,
      volume24h,
      marketCapUsd: marketCapUsd !== undefined && marketCapUsd !== null && String(marketCapUsd) !== 'null' ? String(marketCapUsd) : null,
      lastUpdated: new Date(),
      loading: false,
      error: null
    };
  }

  private parseFromDexScreener(data: any): TokenPrice | null {
    if (!data || !data.pairs || !Array.isArray(data.pairs) || data.pairs.length === 0) return null;

    const pair: DexScreenerPair | undefined = data.pairs.find((p: any) =>
      p && p.chainId === 'polygon' &&
      (p.baseToken?.address?.toLowerCase() === this.CONTRACT.toLowerCase() ||
       p.quoteToken?.address?.toLowerCase() === this.CONTRACT.toLowerCase())
    ) ?? data.pairs[0];

    if (!pair) return null;

    const priceUsd = pair.priceUsd ? String(pair.priceUsd) : null;
    const change24h = (pair.priceChange?.h24 !== undefined && pair.priceChange.h24 !== null) ? Number(pair.priceChange.h24) : null;
    const volume24h = (pair.volume?.h24 !== undefined && pair.volume.h24 !== null) ? String(pair.volume.h24) : null;
    const rawMarketCap = pair.marketCap ?? pair.fdv;
    const priceNum = this.toNumber(priceUsd);
    let marketCapUsd = rawMarketCap !== undefined && rawMarketCap !== null ? String(rawMarketCap) : null;

    if ((!marketCapUsd || this.toNumber(marketCapUsd) === 0) && priceNum > 0) {
      const supply = 100_000_000;
      marketCapUsd = String(priceNum * supply);
    }

    if (!priceUsd || this.toNumber(priceUsd) === 0) return null;

    return {
      priceUsd,
      priceBtc: null,
      change24h,
      volume24h,
      marketCapUsd,
      lastUpdated: new Date(),
      loading: false,
      error: null
    };
  }

  public refresh() {
    this.fetchPrice();
  }
}
