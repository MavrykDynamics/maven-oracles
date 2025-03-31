from dipdup import fields
from dipdup.models import Model
from collections import OrderedDict

class OracleUser(Model):
    id                                      = fields.BigIntField(pk=True)
    network                                 = fields.CharField(max_length=51, index=True)
    address                                 = fields.CharField(max_length=36, index=True)
    mvn_balance                             = fields.FloatField(default=0)
    smvn_balance                            = fields.FloatField(default=0)

    class Meta:
        table = 'oracle_user'

class OracleUserCache:
    def __init__(self, size: int = 1000) -> None:
        self._size = size
        self._oracle_users: OrderedDict[str, OracleUser] = OrderedDict()

    async def get(self, network: str, address: str) -> OracleUser:
        if address not in self._oracle_users:
            # NOTE: Already created on origination
            self._oracle_users[address], _ = await OracleUser.get_or_create(network=network, address=address)
            if len(self._oracle_users) > self._size:
                self._oracle_users.popitem(last=False)

        return self._oracle_users[address]

    async def clear(self) -> None:
       self._oracle_users.clear()

oracle_user_cache = OracleUserCache()

class Aggregator(Model):
    id                                      = fields.BigIntField(pk=True, index=True)
    address                                 = fields.CharField(max_length=36, index=True)
    network                                 = fields.CharField(max_length=51, index=True)
    metadata                                = fields.JSONField(null=True)
    last_updated_at                         = fields.DatetimeField(auto_now=True)
    creation_timestamp                      = fields.DatetimeField(index=True)
    name                                    = fields.TextField(default='')
    decimals                                = fields.SmallIntField(default=0)
    alpha_pct_per_thousand                  = fields.SmallIntField(default=0)
    pct_oracle_threshold                    = fields.SmallIntField(default=0)
    heart_beat_seconds                      = fields.BigIntField(default=0)
    last_completed_data_round               = fields.BigIntField(default=0)
    last_completed_data_epoch               = fields.BigIntField(default=0, index=True)
    last_completed_data                     = fields.FloatField(default=0.0)
    last_completed_data_pct_oracle_resp     = fields.SmallIntField(default=0)
    last_completed_data_last_updated_at     = fields.DatetimeField(index=True)

    class Meta:
        table = 'aggregator'
        indexes = [
            ("creation_timestamp", "last_completed_data_epoch"),
        ]

class AggregatorOracle(Model):
    id                                      = fields.BigIntField(pk=True)
    aggregator                              = fields.ForeignKeyField('models.Aggregator', related_name='oracles', index=True)
    user                                    = fields.ForeignKeyField('models.OracleUser', related_name='aggregator_oracles', index=True)
    public_key                              = fields.CharField(max_length=54, default="", index=True)
    peer_id                                 = fields.TextField(default="")
    init_round                              = fields.BigIntField(index=True)
    init_epoch                              = fields.BigIntField(index=True)

    class Meta:
        table = 'aggregator_oracle'
        indexes = [
            ("aggregator", "user"),
            ("user", "aggregator"),
            ("aggregator", "init_epoch", "init_round"),
            ("public_key", "user"),
        ]

class AggregatorOracleObservation(Model):
    id                                      = fields.BigIntField(pk=True)
    oracle                                  = fields.ForeignKeyField('models.AggregatorOracle', related_name='observations', index=True)
    timestamp                               = fields.DatetimeField(index=True)
    data                                    = fields.FloatField(default=0.0)
    epoch                                   = fields.BigIntField(default=0, index=True)
    round                                   = fields.BigIntField(default=0, index=True)

    class Meta:
        table = 'aggregator_oracle_observation'
        indexes = [
            ("oracle", "timestamp"),
            ("epoch", "round"),
        ]

class AggregatorHistoryData(Model):
    id                                      = fields.BigIntField(pk=True)
    aggregator                              = fields.ForeignKeyField('models.Aggregator', related_name='history_data', index=True)
    timestamp                               = fields.DatetimeField(index=True)
    round                                   = fields.BigIntField(default=0, index=True)
    epoch                                   = fields.BigIntField(default=0, index=True)
    data                                    = fields.FloatField(default=0.0)
    pct_oracle_resp                         = fields.SmallIntField(default=0)

    class Meta:
        table = 'aggregator_history_data'
        indexes = [
            ("aggregator", "timestamp"),
            ("round", "epoch"),
            ("aggregator", "timestamp", "epoch"),
            ("epoch", "timestamp"),
        ]
