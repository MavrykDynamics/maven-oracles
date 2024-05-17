import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';
import BigNumber from 'bignumber.js';
import { MessariFetcherConfig } from './messari-fetcher.config.js';
import { IDataFetcher } from '@mavrykdynamics/data-fetcher';
import { getLogger } from './logger.js';
import { map } from 'rxjs/operators';
import { Logger } from 'winston';

@Injectable()
export class MessariFetcherService implements IDataFetcher {
  private readonly _logger: Logger = getLogger({
    defaultMeta: {
      service: MessariFetcherService.name
    }
  });
  private readonly _baseUrl: string = 'https://data.messari.io/api/v1';

  public constructor(
    private readonly _httpService: HttpService,
    private readonly _config: MessariFetcherConfig
  ) {
    if (_config.messariApiKey === '') {
      this._logger.warn(
        'No Messari API key set. You may hit the api request limit. Set the MESSARI_API_KEY env variable with your API Key'
      );
    }
  }

  public async getData([pair1, pair2]: [string, string]): Promise<BigNumber> {
    const coin = pair1.toLowerCase();
    const vsCurrency = pair2.toLowerCase();

    let response: AxiosResponse;

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
      try {
        const response$ = this._httpService
          .get(`${this._baseUrl}/assets/${coin}/metrics/market-data`, {
            headers: {
              'x-messari-api-key': this._config.messariApiKey
            }
          })
          .pipe(map((response) => response.data));

        response = await firstValueFrom(response$);
      } catch (e) {
        throw new Error(`Failed to fetch market data of coin ${coin} from Messari API: ${e.toString()}`);
      }

      const data: number = response.data?.market_data?.[`price_${vsCurrency}`];

      if (data === undefined || data === null) {
        this._logger.verbose(`Could not parse data from response: ${JSON.stringify(response)}`);
        this._logger.error('Could not parse data from response');
        throw new Error('Could not parse data from response');
      }

      return new BigNumber(data);
    }
  }
}
