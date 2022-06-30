import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OracleConfig } from './oracle.config.js';
import { PacemakerNetworkService } from './pacemaker.network.service.js';
import { PeerId } from '@libp2p/interface-peer-id';
import { EventHubService } from './eventhub.service.js';

@Injectable()
export class SmartContractMockService {
  private readonly _logger: Logger = new Logger(SmartContractMockService.name);

  public async getOracles(): Promise<
    {
      address: string;
      publicKey: string;
      peerId: string;
    }[]
  > {
    return [
      { peerId: '12D3KooWJQWBQvefFGj3uAzKGhpZYWYGKtj2fNQAG47aov4uj9p1', publicKey: '', address: '' },
      { peerId: '12D3KooWBpgAXhUAgjPAwEk5FJ9DRB2kFbuj8KLkPPmqKKmzrXz2', publicKey: '', address: '' },
      { peerId: '12D3KooWLL2Y1JmrAXkY7r8xbuSRtasfJLAarXmAaZPYxPnzgAJ3', publicKey: '', address: '' },
      { peerId: '12D3KooWK87KmBGJZZMP3keux62VF515mFRbNRFwbYxib7wWQR34', publicKey: '', address: '' },
      { peerId: '12D3KooWDgabT39cFp5j5mvJgiGPEppMuVgDCsNtBCh1Q8ejBCA5', publicKey: '', address: '' },
      { peerId: '12D3KooWEKXXjviRoWwoB37UzBT4qjUBbQH8bypWy3YWmyfvR736', publicKey: '', address: '' },
      { peerId: '12D3KooWRGcN9uh633ucfUJ3XQ69n31mB2jPHKtrw7mfCSJdLz97', publicKey: '', address: '' }
    ];
  }

  public async getFValue(): Promise<number> {
    const oracles = await this.getOracles();
    return Math.floor((oracles.length - 1) / 3);
  }
}
