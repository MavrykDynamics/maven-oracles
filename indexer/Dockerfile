FROM python:3.12.4-slim

RUN pip install poetry==1.8.4

WORKDIR /indexer
COPY indexer/poetry.lock indexer/pyproject.toml /indexer/
COPY indexer/dipdup.yml /indexer/
COPY indexer/dipdup.contracts.yml /indexer/
COPY indexer/dipdup.prod.yml /indexer/

RUN poetry config virtualenvs.create false && poetry install --only main

ADD indexer/oracles /indexer/oracles/

ENTRYPOINT ["poetry", "run", "dipdup", "-c", "dipdup.prod.yml", "-c", "dipdup.contracts.yml", "-c", "dipdup.yml", "run"]

EXPOSE 9090/tcp
