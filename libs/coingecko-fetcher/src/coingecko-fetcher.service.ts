import { Injectable, OnModuleInit } from '@nestjs/common';
import { AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import BigNumber from 'bignumber.js';
import { CoingeckoFetcherConfig } from './coingecko-fetcher.config.js';
import { IDataFetcher } from '@mavrykdynamics/data-fetcher';
import { getLogger } from './logger.js';
import { map } from 'rxjs/operators';
import { Logger } from 'winston';

@Injectable()
export class CoingeckoFetcherService implements IDataFetcher, OnModuleInit {
  private readonly _logger: Logger = getLogger({
    defaultMeta: {
      service: CoingeckoFetcherService.name
    }
  });
  // Paid keys (Lite/Analyst/Pro/Enterprise) live on the Pro host; Demo/free keys and
  // anonymous access live on the public host. Set once from config in the constructor.
  private readonly _isPro: boolean;
  private readonly _baseUrl: string;
  private readonly _apiKey: string;

  private _symbolToId: Map<string, string> = new Map<string, string>();
  private _supportedVsCurrencies: Set<string> = new Set<string>();

  public constructor(
    private readonly _httpService: HttpService,
    private readonly _config: CoingeckoFetcherConfig
  ) {
    this._isPro = _config.coingeckoApiPlan.toLowerCase() === 'pro';
    this._baseUrl = this._isPro ? 'https://pro-api.coingecko.com/api/v3' : 'https://api.coingecko.com/api/v3';
    // Trim so a trailing newline/space in the injected secret (common with `echo key | base64`)
    // isn't sent in the auth header and silently rejected as an anonymous request.
    this._apiKey = (_config.coingeckoApiKey ?? '').trim();

    if (this._apiKey === '') {
      this._logger.warn(
        'No Coingecko API key set. You may hit the api request limit. Set the COINGECKO_API_KEY env variable with your API Key'
      );
    } else {
      this._logger.info(`Using Coingecko ${this._isPro ? 'Pro' : 'Demo'} API (${this._baseUrl})`);
    }
  }

  public async onModuleInit(): Promise<void> {
    // Populate the symbol->id map and supported-vs-currencies set. Do NOT re-throw: the app
    // must tolerate a fetcher being down at boot. Coingecko throttles the unauthenticated
    // /coins/list hard, so if a call is rate-limited here it is retried lazily on the next
    // getData via _ensureReady() — a transient boot-time 429 self-heals instead of
    // permanently disabling the fetcher (which previously required a pod restart).
    await this._ensureReady();
  }

  /**
   * Authentication headers for Coingecko. Paid (Pro) keys use the `x-cg-pro-api-key` header
   * on the Pro host; Demo keys use `x-cg-demo-api-key` on the public host. Without a key the
   * public, heavily rate-limited API is used.
   */
  private _authHeaders(): Record<string, string> {
    if (this._apiKey === '') {
      return {};
    }
    return this._isPro ? { 'x-cg-pro-api-key': this._apiKey } : { 'x-cg-demo-api-key': this._apiKey };
  }

  /**
   * Lazily (re)populate only the pieces that are still missing. Failures are logged rather
   * than thrown, so a single provider hiccup neither blocks nor crashes the caller and the
   * next round retries automatically.
   */
  private async _ensureReady(): Promise<void> {
    const tasks: Promise<void>[] = [];
    if (this._symbolToId.size === 0) {
      tasks.push(this._updateSymbolToIdMap());
    }
    if (this._supportedVsCurrencies.size === 0) {
      tasks.push(this._updateSupportedVsCurrenciesSet());
    }
    if (tasks.length === 0) {
      return;
    }
    const results = await Promise.allSettled(tasks);
    for (const result of results) {
      if (result.status === 'rejected') {
        this._logger.warn(
          `Coingecko initialization incomplete: ${result.reason?.toString?.() ?? result.reason}`
        );
      }
    }
  }

  private async _updateSymbolToIdMap(): Promise<void> {
    let response: AxiosResponse;

    try {
      const response$ = this._httpService.get(`${this._baseUrl}/coins/list?include_platform=true`, {
        headers: this._authHeaders()
      });

      response = await firstValueFrom(response$);
    } catch (e) {
      throw new Error(
        `Failed to fetch coins list data from Coingecko, the data fetcher won't work correctly: ${e.toString()}`
      );
    }

    if (response.status !== 200) {
      throw new Error(
        "Failed to fetch coins list data from Coingecko, the data fetcher won't work correctly"
      );
    }

    const coins = response.data;
    const supportedIds =
      this._config.coingeckoSupportedIds.length === 0 ? [] : this._config.coingeckoSupportedIds.split(',');

    if (supportedIds.length === 0) {
      throw new Error(
        '`COINGECKO_SUPPORTED_IDS` environment variable not set, the data fetcher is disabled as a safety measure'
      );
    }

    this._logger.verbose(`Supports ${supportedIds.length} ids`);

    for (const coin of coins) {
      // TODO: refactor coingecko configuration process
      if (supportedIds.indexOf(coin.id) > -1) this._symbolToId.set(coin.symbol, coin.id);
    }

    this._logger.verbose(`Fetched ids of ${this._symbolToId.size} coins`);
  }

  private async _updateSupportedVsCurrenciesSet(): Promise<void> {
    let response: AxiosResponse;
    try {
      const response$ = this._httpService.get(`${this._baseUrl}/simple/supported_vs_currencies`, {
        headers: this._authHeaders()
      });

      response = await firstValueFrom(response$);
    } catch (e) {
      throw new Error(
        `Failed to fetch supportedVsCurrencies data from Coingecko, the data fetcher won't work correctly: ${e.toString()}`
      );
    }

    if (response.status !== 200) {
      throw new Error(
        "Failed to fetch supportedVsCurrencies data from Coingecko, the data fetcher won't work correctly"
      );
    }

    const supportedVsCurrencies = response.data;

    for (const supportedVsCurrency of supportedVsCurrencies) {
      this._supportedVsCurrencies.add(supportedVsCurrency);
    }

    this._logger.verbose(`Fetched ${this._supportedVsCurrencies.size} supported vs currencies`);
  }

  public async getData([pair1, pair2]: [string, string]): Promise<BigNumber> {
    const coin = pair1.toLowerCase();
    const vsCurrency = pair2.toLowerCase();

    // Self-heal: if a boot-time fetch was rate-limited, repopulate any empty map/set now
    // rather than failing forever with a misleading "Not supported ... as VS currency".
    await this._ensureReady();

    if (!this._supportedVsCurrencies.has(vsCurrency)) {
      throw new Error(`Not supported ${vsCurrency} as VS currency`);
    }

    //TODO: Remove after demo
    if (coin === 'ocean') {
      const random = Math.random() * 0.005 + 50;
      return new BigNumber(parseFloat(random.toFixed(3)));
    } else if (coin === 'mars1') {
      const random = Math.random() * 0.005 + 75;
      return new BigNumber(parseFloat(random.toFixed(3)));
    } else if (coin === 'queen') {
      const random = Math.random() * 0.005 + 100;
      return new BigNumber(parseFloat(random.toFixed(3)));
    } else if (coin === 'ntbm') {
      const random = Math.random() * 0.005 + 100;
      return new BigNumber(parseFloat(random.toFixed(3)));
    } else {
      const coinId = this._symbolToId.get(coin);

      if (coinId === undefined) {
        throw new Error(`Not supported ${coin} as coin`);
      }

      let response: AxiosResponse;
      try {
        const response$ = this._httpService
          .get(`${this._baseUrl}/simple/price`, {
            headers: this._authHeaders(),
            params: {
              ids: this._symbolToId.get(coin),
              vs_currencies: vsCurrency
            }
          })
          .pipe(map((response) => response.data));

        response = await firstValueFrom(response$);
      } catch (e) {
        throw new Error(
          `Failed to fetch supportedVsCurrencies data from Coingecko, the data fetcher won't work correctly: ${e.toString()}`
        );
      }

      return response[coinId][vsCurrency];
    }
  }
}
