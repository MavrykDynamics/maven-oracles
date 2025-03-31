from dipdup.context import HandlerContext
from dipdup.models.tezos import TezosTransaction
from oracles.utils import get_contract_metadata
from oracles import models as models
from oracles.types.aggregator.tezos_parameters.update_metadata import UpdateMetadataParameter
from oracles.types.aggregator.tezos_storage import AggregatorStorage


async def update_metadata(
    ctx: HandlerContext,
    update_metadata: TezosTransaction[UpdateMetadataParameter, AggregatorStorage],
) -> None:
    # Get operation info
    aggregator_address  = update_metadata.data.target_address

    # Get contract metadata
    contract_metadata   = await get_contract_metadata(
        ctx=ctx,
        contract_address=aggregator_address
    )

    # Update record
    await models.Aggregator.filter(
        address = aggregator_address,
        network = 'atlasnet'
    ).update(
        metadata = contract_metadata
    )