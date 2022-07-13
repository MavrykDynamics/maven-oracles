import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import BigNumber from 'bignumber.js';
import { IPriceFetcher } from './messari-fetcher.service';
import { OracleConfig } from './oracle.config.js';

@Injectable()
export class CoingeckoFetcherService implements IPriceFetcher, OnModuleInit {
  private readonly _logger: Logger = new Logger(CoingeckoFetcherService.name);
  private readonly _baseUrl: string = 'https://api.coingecko.com/api/v3';

  private _symbolToId: Map<string, string> = new Map<string, string>();
  private _supportedVsCurrencies: Set<string> = new Set<string>();

  public constructor(
    private readonly _httpService: HttpService,
    private readonly _config: OracleConfig
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
      // The app should handle some price fetcher being down
    }
  }

  private async _updateSymbolToIdMap(): Promise<void> {
    let response: AxiosResponse;

    try {
      const response$ = this._httpService.get(`${this._baseUrl}/coins/list`, {
        //headers: {
        //  'x-messari-api-key': this.config.messariApiKey,
        //},
      });

      response = await firstValueFrom(response$);
    } catch (e) {
      throw new Error(
        `Failed to fetch coins list data from Coingecko, the price fetcher won't work correctly: ${e.toString()}`
      );
    }

    if (response.status !== 200) {
      throw new Error(
        "Failed to fetch coins list data from Coingecko, the price fetcher won't work correctly"
      );
    }

    const coins = response.data;

    for (const coin of coins) {
      this._symbolToId.set(coin.symbol, coin.id);
    }

    this._logger.verbose(`Fetched ids of ${this._symbolToId.size} coins`);
  }

  private async _updateSupportedVsCurrenciesSet(): Promise<void> {
    let response: AxiosResponse;
    try {
      const response$ = this._httpService.get(
        `${this._baseUrl}/simple/supported_vs_currencies`,
        {
          //headers: {
          //  'x-messari-api-key': this.config.messariApiKey,
          //},
        }
      );

      response = await firstValueFrom(response$);
    } catch (e) {
      throw new Error(
        `Failed to fetch supportedVsCurrencies data from Coingecko, the price fetcher won't work correctly: ${e.toString()}`
      );
    }

    if (response.status !== 200) {
      throw new Error(
        "Failed to fetch supportedVsCurrencies data from Coingecko, the price fetcher won't work correctly"
      );
    }

    const supportedVsCurrencies = response.data;

    for (const supportedVsCurrency of supportedVsCurrencies) {
      this._supportedVsCurrencies.add(supportedVsCurrency);
    }

    this._logger.verbose(
      `Fetched ${this._supportedVsCurrencies.size} supported vs currencies`
    );
  }

  public async getPrice([pair1, pair2]: [string, string]): Promise<BigNumber> {
    const vsCurrency = pair1.toLowerCase();
    const coin = pair2.toLowerCase();

    if (!this._supportedVsCurrencies.has(vsCurrency)) {
      throw new Error(`Not supported ${vsCurrency} as VS currency`);
    }

    const coinId = this._symbolToId.get(coin);

    if (coinId === undefined) {
      throw new Error(`Not supported ${coin} as coin`);
    }

    let response: AxiosResponse;
    try {
      const response$ = this._httpService.get(`${this._baseUrl}/simple/price`, {
        params: {
          ids: this._symbolToId.get(coin),
          vs_currencies: vsCurrency,
        },
        //headers: {
        //  'x-messari-api-key': this.config.messariApiKey,
        //},
      });

      response = await firstValueFrom(response$);
    } catch (e) {
      throw new Error(
        `Failed to fetch supportedVsCurrencies data from Coingecko, the price fetcher won't work correctly: ${e.toString()}`
      );
    }

    return response.data[coinId][vsCurrency];
  }
}