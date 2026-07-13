import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';
import BigNumber from 'bignumber.js';
import { AlphavantageFetcherConfig } from './alphavantage-fetcher.config.js';
import { IDataFetcher } from '@mavrykdynamics/data-fetcher';
import { getLogger } from './logger.js';
import { map } from 'rxjs/operators';
import { Logger } from 'winston';

@Injectable()
export class AlphavantageFetcherService implements IDataFetcher {
  private readonly _logger: Logger = getLogger({
    defaultMeta: {
      service: AlphavantageFetcherService.name
    }
  });
  private readonly _baseUrl: string = 'https://www.alphavantage.co/query?function=CRYPTO_INTRADAY';

  public constructor(
    private readonly _httpService: HttpService,
    private readonly _config: AlphavantageFetcherConfig
  ) {
    if (_config.alphavantageApiKey === '') {
      this._logger.warn(
        'No Alphavantage API key set. You may hit the api request limit. Set the MESSARI_API_KEY env variable with your API Key'
      );
    }
  }

  public async getData([pair1, pair2]: [string, string]): Promise<BigNumber> {
    const coin = pair1.toLowerCase();
    const vsCurrency = pair2.toLowerCase();
    let response: AxiosResponse;

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
        const response$ = this._httpService
          .get(
            `${this._baseUrl}&symbol=${coin}&market=${vsCurrency}&interval=${this._config.alphavantageInterval}min&apikey=${this._config.alphavantageApiKey}`
          )
          .pipe(map((response) => response.data));

        response = await firstValueFrom(response$);
      } catch (e) {
        throw new Error(`Failed to fetch market data of coin ${coin} from Alphavantage API: ${e.toString()}`);
      }

      const dataList = response?.[`Time Series Crypto (${this._config.alphavantageInterval}min)`];
      const dataObject = dataList[Object.keys(dataList)[0]];

      const dataHigh = new BigNumber(dataObject['2. high']);
      const dataLow = new BigNumber(dataObject['3. low']);
      const data = dataHigh.plus(dataLow).dividedBy(2);

      if (data === undefined || data === null || isNaN(data.toNumber())) {
        this._logger.verbose(`Could not parse data from response: ${JSON.stringify(response)}`);
        this._logger.error('Could not parse data from response');
        throw new Error('Could not parse data from response');
      }

      return data;
    }
  }
}
