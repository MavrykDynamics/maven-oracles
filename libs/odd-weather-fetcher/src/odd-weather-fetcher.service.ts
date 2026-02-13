import { Injectable, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import BigNumber from 'bignumber.js';
import { AxiosResponse } from 'axios';
import { IOddDataFetcher } from '@mavrykdynamics/data-fetcher';
import { OddWeatherFetcherConfig } from './odd-weather-fetcher.config.js';
import { getLogger } from './logger.js';
import { Logger } from 'winston';

@Injectable()
export class OddWeatherFetcherService implements IOddDataFetcher, OnModuleInit {
  private readonly _logger: Logger = getLogger({
    defaultMeta: {
      service: OddWeatherFetcherService.name
    }
  });

  public constructor(
    private readonly _httpService: HttpService,
    private readonly _config: OddWeatherFetcherConfig
  ) {
    if (!_config.oddWeatherApiEndpoint) {
      this._logger.warn(
        'No ODD_WEATHER_API_ENDPOINT configured. The fetcher will not function properly.'
      );
    }
  }

  public async getData(key: string): Promise<BigNumber> {
    let response: AxiosResponse;

    try {
      const response$ = this._httpService
        .get(`${this._config.oddWeatherApiEndpoint}/${key}`)
        .pipe(map((response) => response.data));

      response = await firstValueFrom(response$);
    } catch (e) {
      throw new Error(`Failed to fetch metric "${key}" from OddWeather API: ${e.toString()}`);
    }

    /**
     * Expected API response format example:
     * {
     *   "value": 42.5
     * }
     */

    const value: number = response?.value;

    if (value === undefined || value === null) {
      this._logger.verbose(`Could not parse data from response: ${JSON.stringify(response)}`);
      this._logger.error('Could not parse metric value from response');
      throw new Error('Could not parse metric value from response');
    }

    return new BigNumber(value);
  }
}
