from dipdup.context import HandlerContext
from dipdup.models.tezos import TezosTransaction
from oracles import models as models
from oracles.types.aggregator.tezos_parameters.update_config import UpdateConfigParameter
from oracles.types.aggregator.tezos_storage import AggregatorStorage


async def update_config(
    ctx: HandlerContext,
    update_config: TezosTransaction[UpdateConfigParameter, AggregatorStorage],
) -> None:
    # Get operation values
    aggregator_address      = update_config.data.target_address
    timestamp               = update_config.data.timestamp

    # Update contract
    await models.Aggregator.filter(
        network = 'basenet',
        address = aggregator_address
    ).update(
        last_updated_at  = timestamp,
        decimals = update_config.storage.config.decimals,
        alpha_pct_per_thousand = update_config.storage.config.alphaPercentPerThousand,
        pct_oracle_threshold = update_config.storage.config.percentOracleThreshold,
        heart_beat_seconds = update_config.storage.config.heartbeatSeconds
    )