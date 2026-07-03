from dipdup.context import HandlerContext
from dipdup.models.tezos import TezosTransaction
from oracles import models as models
from oracles.types.aggregator.tezos_parameters.set_name import SetNameParameter
from oracles.types.aggregator.tezos_storage import AggregatorStorage


async def set_name(
    ctx: HandlerContext,
    set_name: TezosTransaction[SetNameParameter, AggregatorStorage],
) -> None:
    # Get operation info
    aggregator_address      = set_name.data.target_address
    name                    = set_name.parameter.root

    # Update contract
    await models.Aggregator.filter(
        network = 'basenet',
        address = aggregator_address
    ).update(
        name    = name
    )