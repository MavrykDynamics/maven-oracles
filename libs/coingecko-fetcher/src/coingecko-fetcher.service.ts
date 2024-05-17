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
  private readonly _baseUrl: string = 'https://api.coingecko.com/api/v3';

  private _symbolToId: Map<string, string> = new Map<string, string>();
  private _supportedVsCurrencies: Set<string> = new Set<string>();

  public constructor(
    private readonly _httpService: HttpService,
    private readonly _config: CoingeckoFetcherConfig
  ) {
    if (_config.coingeckoApiKey === '') {
      this._logger.warn(
        'No Coingecko API key set. You may hit the api request limit. Set the COINGECKO_API_KEY env variable with your API Key'
      );
    }
  }

  public async onModuleInit(): Promise<void> {
    try {
      await this._updateSymbolToIdMap();
      await this._updateSupportedVsCurrenciesSet();
    } catch (e) {
      this._logger.error(e.toString());
      // Do not re-throw to avoid crashing app
      // The app should handle some data fetcher being down
    }
  }

  private async _updateSymbolToIdMap(): Promise<void> {
    let response: AxiosResponse;

    try {
      const response$ = this._httpService.get(`${this._baseUrl}/coins/list?include_platform=true`, {
        //headers: {
        //  'x-messari-api-key': this.config.messariApiKey,
        //},
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
    const supportedPlatforms =
      this._config.coingeckoSupportedPlatforms.length === 0
        ? []
        : this._config.coingeckoSupportedPlatforms.split(',');
    this._logger.verbose(`Supports ${supportedPlatforms.length} platforms`);

    for (const coin of coins) {
      // TODO: refactor coingecko configuration process
      if (Object.keys(coin.platforms).length === 0) {
        this._symbolToId.set(coin.symbol, coin.id);
      } else {
        supportedPlatforms.forEach((platform) => {
          if (coin.platforms.hasOwnProperty(platform.toLowerCase())) {
            this._symbolToId.set(coin.symbol, coin.id);
          }
        });
      }
    }

    this._logger.verbose(`Fetched ids of ${this._symbolToId.size} coins`);
  }

  private async _updateSupportedVsCurrenciesSet(): Promise<void> {
    let response: AxiosResponse;
    try {
      const response$ = this._httpService.get(`${this._baseUrl}/simple/supported_vs_currencies`, {
        //headers: {
        //  'x-messari-api-key': this.config.messariApiKey,
        //},
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

    if (!this._supportedVsCurrencies.has(vsCurrency)) {
      throw new Error(`Not supported ${vsCurrency} as VS currency`);
    }

    //TODO: Remove after demo
    if (coin === 'ocean') {
      const random = Math.random() * 0.005 + 53.155;
      return new BigNumber(parseFloat(random.toFixed(3)));
    } else if (coin === 'mars1') {
      const random = Math.random() * 0.005 + 420.69;
      return new BigNumber(parseFloat(random.toFixed(3)));
    } else if (coin === 'mvrk') {
      const random = Math.random() * 0.0001 + 2.648925;
      return new BigNumber(parseFloat(random.toFixed(6)));
    } else {
      const coinId = this._symbolToId.get(coin);

      if (coinId === undefined) {
        throw new Error(`Not supported ${coin} as coin`);
      }

      let response: AxiosResponse;
      try {
        const response$ = this._httpService
          .get(`${this._baseUrl}/simple/price`, {
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
