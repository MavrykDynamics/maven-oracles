import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';
import BigNumber from 'bignumber.js';
import { MessariFetcherConfig } from './messari-fetcher.config.js';
import { IPriceFetcher } from '@tezosdynamics/price-fetcher';
import { getLogger } from './logger.js';
import { Logger } from 'winston';

@Injectable()
export class MessariFetcherService implements IPriceFetcher {
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

  public async getPrice([pair1, pair2]: [string, string]): Promise<BigNumber> {
    const vsCurrency = pair1.toLowerCase();
    const coin = pair2.toLowerCase();

    let response: AxiosResponse;
    try {
      const response$ = this._httpService.get(`${this._baseUrl}/assets/${coin}/metrics/market-data`, {
        headers: {
          'x-messari-api-key': this._config.messariApiKey
        }
      });

      response = await firstValueFrom(response$);
    } catch (e) {
      throw new Error(`Failed to fetch market data of coin ${coin} from Messari API: ${e.toString()}`);
    }

    const price: number = response.data?.data?.market_data?.[`price_${vsCurrency}`];

    if (price === undefined || price === null) {
      this._logger.verbose(`Could not parse price from response: ${JSON.stringify(response)}`);
      this._logger.error('Could not parse price from response');
      throw new Error('Could not parse price from response');
    }

    return new BigNumber(price);
  }
}
