from dipdup.context import HandlerContext
from dipdup.models.tezos import TezosOrigination
from indexer.oracles.utils import get_contract_metadata
from oracles import models as models
from oracles.types.aggregator.tezos_storage import AggregatorStorage
from dateutil import parser


async def origination(
    ctx: HandlerContext,
    aggregator_origination: TezosOrigination[AggregatorStorage],
) -> None:
    # Check if aggregator should be added to the tracking list
    whitelist_contracts                         = aggregator_origination.storage.whitelistContracts
    aggregator_factory_address                  = ctx.config.contracts['aggregator_factory'].address
    if not aggregator_factory_address in whitelist_contracts:
        return

    # Get operation info
    aggregator_address                          = aggregator_origination.data.originated_contract_address
    admin                                       = aggregator_origination.storage.admin
    creation_timestamp                          = aggregator_origination.data.timestamp
    name                                        = aggregator_origination.storage.name
    decimals                                    = int(aggregator_origination.storage.config.decimals)
    alpha_pct_per_thousand                      = int(aggregator_origination.storage.config.alphaPercentPerThousand)
    pct_oracle_threshold                        = int(aggregator_origination.storage.config.percentOracleThreshold)
    heart_beat_seconds                          = int(aggregator_origination.storage.config.heartbeatSeconds)
    last_completed_data_round                   = int(aggregator_origination.storage.lastCompletedData.round)
    last_completed_data_epoch                   = int(aggregator_origination.storage.lastCompletedData.epoch)
    last_completed_data                         = float(aggregator_origination.storage.lastCompletedData.data)
    last_completed_data_pct_oracle_resp         = int(aggregator_origination.storage.lastCompletedData.percentOracleResponse)
    last_completed_data_last_updated_at         = parser.parse(aggregator_origination.storage.lastCompletedData.lastUpdatedAt)
    oracles                                     = aggregator_origination.storage.oracleLedger

    # Get contract metadata
    contract_metadata = await get_contract_metadata(
        ctx=ctx,
        contract_address=aggregator_address
    )

    # Create record
    aggregator                  = models.Aggregator(
        network                                     = 'basenet',
        address                                     = aggregator_address,
        metadata                                    = contract_metadata,
        admin                                       = admin,
        creation_timestamp                          = creation_timestamp,
        name                                        = name,
        decimals                                    = decimals,
        alpha_pct_per_thousand                      = alpha_pct_per_thousand,
        pct_oracle_threshold                        = pct_oracle_threshold,
        heart_beat_seconds                          = heart_beat_seconds,
        last_completed_data_round                   = last_completed_data_round,
        last_completed_data_epoch                   = last_completed_data_epoch,
        last_completed_data                         = last_completed_data,
        last_completed_data_pct_oracle_resp         = last_completed_data_pct_oracle_resp,
        last_completed_data_last_updated_at         = last_completed_data_last_updated_at
    )
    await aggregator.save()

    # Add oracles to aggregator
    for oracle_address in oracles:
        oracle_storage_record   = oracles[oracle_address]
        oracle_pk               = oracle_storage_record.oraclePublicKey
        oracle_peer_id          = oracle_storage_record.oraclePeerId

        # Create record
        oracle                  = await models.oracle_user_cache.get(network='basenet', address=oracle_address)
        aggregator_oracle       = models.AggregatorOracle(
            aggregator  = aggregator,
            user        = oracle,
            public_key  = oracle_pk,
            peer_id     = oracle_peer_id,
            init_round  = last_completed_data_round,
            init_epoch  = last_completed_data_epoch
        )
        await aggregator_oracle.save()
