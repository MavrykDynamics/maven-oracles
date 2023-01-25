import { Injectable } from '@nestjs/common';
import { OracleConfig } from '../oracle.config.js';
import BigNumber from 'bignumber.js';

import { filterNotNull } from './helpers.js';
import { IDataFetcher } from '@mavrykdynamics/data-fetcher';
import { MessariFetcherService } from '@mavrykdynamics/messari-fetcher';
import { CoingeckoFetcherService } from '@mavrykdynamics/coingecko-fetcher';
import { AlphavantageFetcherService } from '@mavrykdynamics/alphavantage-fetcher';
import { getLogger } from '../logger.js';
import { Logger } from 'winston';

@Injectable()
export class DataService {
  private readonly _logger: Logger = getLogger({
    defaultMeta: {
      service: DataService.name
    }
  });
  private readonly _dataFetchers: IDataFetcher[] = [];

  public constructor(
    messariFetcherService: MessariFetcherService,
    coingeckoFectcherService: CoingeckoFetcherService,
    alphavantageFetcherService: AlphavantageFetcherService,
    private readonly _oracleConfig: OracleConfig
  ) {
    if (this._oracleConfig.useFakeData) {
      this._logger.warn('YOU ARE USING FAKE DATA, DO NOT DO THIS IN PRODUCTION');
    }
    this._dataFetchers = [messariFetcherService, coingeckoFectcherService, alphavantageFetcherService];
  }

  public async getData(decimals: BigNumber, pair: [string, string]): Promise<BigNumber> {
    // if we use fake data, we return a data between 100 and 102
    if (this._oracleConfig.useFakeData) {
      const currentSeconds = new Date().getSeconds();
      const currentMinutes = new Date().getMinutes();

      const val = (currentMinutes % 2) * 60 + currentSeconds; // 0 - 119
      const val0To2 = 2.0 * (val / 119); // 0 - 2
      const val100To102 = 100 + val0To2; // 100 - 102

      return new BigNumber(Math.round(val100To102 * 10 ** decimals.toNumber()));
    }

    // we call the getData method for each data fetcher
    const allData: (number | null)[] = await Promise.all(
      this._dataFetchers.map(async (pf) => {
        let data;

        try {
          data = await pf.getData(pair);
        } catch (e) {
          this._logger.warn(
            `Data fetcher ${pf.constructor.name} failed to fetch data for pair ${pair[0]}/${
              pair[1]
            }: ${e.toString()}`
          );
          return null;
        }
        this._logger.debug(
          `Data fetcher ${pf.constructor.name} answered data [${data}] on pair ${pair[0]}/${pair[1]}`
        );
        return data;
      })
    );

    const notNullData = filterNotNull(allData);

    this._logger.debug(
      `${notNullData.length}/${allData.length} fetchers answered on pair ${pair[0]}/${pair[1]}`
    );

    if (notNullData.length === 0) {
      throw new Error(`All data fetcher failed to fetch value for pair ${pair[0]}/${pair[1]}`);
    }

    // we return the median of the data fetcher responses
    return DataService._median(
      notNullData.map((value) =>
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
