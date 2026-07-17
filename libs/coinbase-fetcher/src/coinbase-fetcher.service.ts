import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';
import BigNumber from 'bignumber.js';
import { CoinbaseFetcherConfig } from './coinbase-fetcher.config.js';
import { IDataFetcher } from '@mavrykdynamics/data-fetcher';
import { getLogger } from './logger.js';
import { Logger } from 'winston';

interface ICoinbaseTickerResponse {
  price: string;
}

@Injectable()
export class CoinbaseFetcherService implements IDataFetcher {
  private readonly _logger: Logger = getLogger({
    defaultMeta: {
      service: CoinbaseFetcherService.name
    }
  });

  public constructor(
    private readonly _httpService: HttpService,
    private readonly _config: CoinbaseFetcherConfig
  ) {}

  public async getData([pair1, pair2]: [string, string]): Promise<BigNumber> {
    const coin = pair1.toLowerCase();
    const vsCurrency = pair2.toLowerCase();

    let response: AxiosResponse<ICoinbaseTickerResponse>;

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
      try {
        const response$ = this._httpService.get<ICoinbaseTickerResponse>(
          `${this._config.coinbaseApiUrl}/products/${coin}-${vsCurrency}/ticker`
        );

        response = await firstValueFrom(response$);
      } catch (e) {
        throw new Error(`Failed to fetch market data of coin ${coin} from Coinbase API: ${e.toString()}`);
      }

      const data: string = response.data?.price;

      if (data === undefined || data === null) {
        this._logger.verbose(`Could not parse data from response: ${JSON.stringify(response.data)}`);
        this._logger.error('Could not parse data from response');
        throw new Error('Could not parse data from response');
      }

      return new BigNumber(data);
    }
  }
}
