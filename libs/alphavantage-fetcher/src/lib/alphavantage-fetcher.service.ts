import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';
import { PriceFetcher } from '@mavryk-oracle-node/price-fetcher';
import { AlphavantageFetcherConfig } from './alphavantage-fetcher.config';
import BigNumber from 'bignumber.js';

@Injectable()
export class AlphavantageFetcherService implements PriceFetcher {
  private readonly logger = new Logger(AlphavantageFetcherService.name);
  private readonly baseUrl = 'https://www.alphavantage.co/query?function=CRYPTO_INTRADAY';
  private readonly avantageInterval = 1; // 1min, 5min, 15min, 30min, 60min

  constructor(
    private readonly httpService: HttpService,
    private readonly config: AlphavantageFetcherConfig
  ) {
    if (config.alphavantageApiKey === '') {
      this.logger.warn(
        'No Alphavantage API key set. You may hit the api request limit. Set the MESSARI_API_KEY env variable with your API Key'
      );
    }
  }

  async getPrice([pair1, pair2]: [string, string]): Promise<BigNumber> {
    const vsCurrency = pair1.toLowerCase();
    const coin = pair2.toLowerCase();

    let response: AxiosResponse;
    try {
      const response$ = this.httpService.get(
        `${this.baseUrl}&symbol=${coin}&market=${vsCurrency}&interval=${this.avantageInterval}min&apikey=${this.config.alphavantageApiKey}`,
        // {
        //   headers: {
        //     'x-alphavantage-api-key': this.config.alphavantageApiKey,
        //   },
        // }
      );

      response = await firstValueFrom(response$);
    } catch (e) {
      throw new Error(
        `Failed to fetch market data of coin ${coin} from Alphavantage API: ${e.toString()}`
      );
    }

    const priceList = response.data?.[`Time Series Crypto (${this.avantageInterval}min)`];
    const priceObject =  priceList[Object.keys(priceList)[0]];
    const priceHigh = priceObject["2. high"];
    const priceLow = priceObject["3. low"];
    const price = (priceHigh + priceLow) / 2;

    if (price === undefined || price === null) {
      this.logger.verbose(
        `Could not parse price from response: ${JSON.stringify(response)}`
      );
      this.logger.error('Could not parse price from response');
      throw new Error('Could not parse price from response');
    }

    return new BigNumber(price);
  }
}
