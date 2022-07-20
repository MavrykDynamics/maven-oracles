import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';
import BigNumber from 'bignumber.js';
import { OracleConfig } from './oracle.config.js';
import { IPriceFetcher } from './messari-fetcher.service.js';

@Injectable()
export class AlphavantageFetcherService implements IPriceFetcher {
  private readonly _logger: Logger = new Logger(AlphavantageFetcherService.name);
  private readonly _baseUrl: string = 'https://www.alphavantage.co/query?function=CRYPTO_INTRADAY';

  public constructor(private readonly _httpService: HttpService, private readonly _config: OracleConfig) {
    if (_config.alphavantageApiKey === '') {
      this._logger.warn(
        'No Alphavantage API key set. You may hit the api request limit. Set the MESSARI_API_KEY env variable with your API Key'
      );
    }
  }

  public async getPrice([pair1, pair2]: [string, string]): Promise<BigNumber> {
    const vsCurrency = pair1.toLowerCase();
    const coin = pair2.toLowerCase();
    let response: AxiosResponse;
    try {
      const response$ = this._httpService.get(
        `${this._baseUrl}&symbol=${coin}&market=${vsCurrency}&interval=${this._config.alphavantageInterval}min&apikey=${this._config.alphavantageApiKey}`
      );

      response = await firstValueFrom(response$);
    } catch (e) {
      throw new Error(`Failed to fetch market data of coin ${coin} from Alphavantage API: ${e.toString()}`);
    }

    const priceList = response.data?.[`Time Series Crypto (${this._config.alphavantageInterval}min)`];
    const priceObject = priceList[Object.keys(priceList)[0]];

    const priceHigh = new BigNumber(priceObject['2. high']);
    const priceLow = new BigNumber(priceObject['3. low']);
    const price = priceHigh.plus(priceLow).dividedBy(2);

    if (price === undefined || price === null || isNaN(price.toNumber())) {
      this._logger.verbose(`Could not parse price from response: ${JSON.stringify(response)}`);
      this._logger.error('Could not parse price from response');
      throw new Error('Could not parse price from response');
    }
    return price;
  }
}
