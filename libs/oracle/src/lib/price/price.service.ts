import { Injectable, Logger } from '@nestjs/common';
import { OracleConfig } from '../oracle.config.js';
import BigNumber from 'bignumber.js';

import { filterNotNull } from './helpers.js';
import { IPriceFetcher } from '@tezosdynamics/price-fetcher';
import { MessariFetcherService } from '@tezosdynamics/messari-fetcher';
import { CoingeckoFetcherService } from '@tezosdynamics/coingecko-fetcher';
import { AlphavantageFetcherService } from '@tezosdynamics/alphavantage-fetcher';

@Injectable()
export class PriceService {
  private readonly _logger: Logger = new Logger(PriceService.name);
  private readonly _priceFetchers: IPriceFetcher[] = [];

  public constructor(
    messariFetcherService: MessariFetcherService,
    coingeckoFectcherService: CoingeckoFetcherService,
    alphavantageFetcherService: AlphavantageFetcherService,
    private readonly _oracleConfig: OracleConfig
  ) {
    if (this._oracleConfig.useFakePrices) {
      this._logger.warn('YOU ARE USING FAKE PRICES, DO NOT DO THIS IN PRODUCTION');
    }
    this._priceFetchers = [messariFetcherService, coingeckoFectcherService, alphavantageFetcherService];
  }

  public async getPrice(decimals: BigNumber, pair: [string, string]): Promise<BigNumber> {
    if (this._oracleConfig.useFakePrices) {
      // return new BigNumber(10);
      const currentSeconds = new Date().getSeconds();
      const currentMinutes = new Date().getMinutes();

      const val = (currentMinutes % 2) * 60 + currentSeconds; // 0 - 119
      const val0To2 = 2.0 * (val / 119); // 0 - 2
      const val100To102 = 100 + val0To2; // 100 - 102

      return new BigNumber(Math.round(val100To102 * 10 ** decimals.toNumber()));
    }

    const prices: (number | null)[] = await Promise.all(
      this._priceFetchers.map(async (pf) => {
        let price;

        try {
          price = await pf.getPrice(pair);
        } catch (e) {
          this._logger.warn(
            `Price fetcher ${pf.constructor.name} failed to fetch price for pair ${pair[0]}/${
              pair[1]
            }: ${e.toString()}`
          );
          return null;
        }
        this._logger.debug(
          `Price fetcher ${pf.constructor.name} answered price [${price}] on pair ${pair[0]}/${pair[1]}`
        );
        return price;
      })
    );

    const notNullPrices = filterNotNull(prices);

    this._logger.debug(
      `${notNullPrices.length}/${prices.length} fetchers answered on pair ${pair[0]}/${pair[1]}`
    );

    if (notNullPrices.length === 0) {
      throw new Error(`All price fetcher failed to fetch value for pair ${pair[0]}/${pair[1]}`);
    }

    return PriceService._median(
      notNullPrices.map((value) =>
        new BigNumber(value).multipliedBy(new BigNumber(10).exponentiatedBy(decimals))
      )
    ).decimalPlaces(0);
  }

  private static _median(arr: BigNumber[]): BigNumber {
    const mid = Math.floor(arr.length / 2),
      nums = [...arr].sort((a, b) => (a.isGreaterThan(b) ? 1 : -1));
    return arr.length % 2 !== 0 ? nums[mid] : nums[mid - 1].plus(nums[mid]).div(2);
  }
}
