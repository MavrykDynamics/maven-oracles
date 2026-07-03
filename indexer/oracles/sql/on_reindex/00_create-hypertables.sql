-- Check and create hypertables if not already created
ALTER TABLE aggregator_oracle_observation DROP CONSTRAINT aggregator_oracle_observation_pkey;
ALTER TABLE aggregator_oracle_observation ADD PRIMARY KEY (id, timestamp);
SELECT create_hypertable('aggregator_oracle_observation', 'timestamp', if_not_exists => TRUE);

ALTER TABLE aggregator_history_data DROP CONSTRAINT aggregator_history_data_pkey;
ALTER TABLE aggregator_history_data ADD PRIMARY KEY (id, timestamp);
SELECT create_hypertable('aggregator_history_data', 'timestamp', if_not_exists => TRUE);
