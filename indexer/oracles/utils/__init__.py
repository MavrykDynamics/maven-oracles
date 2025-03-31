async def get_contract_metadata(ctx, contract_address):
    metadata_datasource_name    = 'metadata_atlasnet'
    metadata_datasource         = None
    contract_metadata           = None

    try:
        metadata_datasource         = ctx.get_tzip_metadata_datasource(metadata_datasource_name)
    except BaseException as e:
        ...

    if metadata_datasource:
        try:
            contract_metadata           = await metadata_datasource.get_contract_metadata(contract_address)
        except BaseException as e:
            ...

    return contract_metadata