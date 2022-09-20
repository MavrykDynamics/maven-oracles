#include "./aggregator.ligo"

type trackedAggregatorsType is map (string * string, address);
type trackedSatelliteType is set (address);

type storage is record [
    trackedAggregators: trackedAggregatorsType;
]


type createAggregatorParamsType is string * string * [@layout:comb] record[
    config              : configType;   
    oracleAddresses     : oracleAddressesType;
];

type templateAction is
    | First of (nat)
    | CreateAggregator of createAggregatorParamsType

const noOperations : list (operation) = nil;
type return is list (operation) * storage;
type createAggregatorFuncType is (option(key_hash) * tez * aggregatorStorage) -> (operation * address);


[@view] function getAggregator (const pair : string*string ; const store: storage) : address is block {
  const aggregatorAddress : address = case store.trackedAggregators[pair] of [
    Some(_address) -> _address
    | None -> failwith("Error. Aggregator not found.")
  ];
} with (aggregatorAddress)


const createAggregatorFunc: createAggregatorFuncType =
[%Michelson ( {| { UNPPAIIR ;
                  CREATE_CONTRACT
#include "../compiled/aggregator.tz"
        ;
          PAIR } |}
: createAggregatorFuncType)];

function first(const _proposal : nat ; var s : storage) : return is
block {
    skip
} with (noOperations, s)

function createAggregator(const createAggregatorParams: createAggregatorParamsType; var s: storage): return is
block {
        const originatedAggregatorStorage: aggregatorStorage = record [
          oracleAddresses=createAggregatorParams.2.oracleAddresses;
          lastCompletedPrice=record[
            price=(0n : nat);
            epoch=(0n : nat);
            round=(0n : nat);
            time=(0 : timestamp);
          ];
          config=record[
            heartBeatSeconds=createAggregatorParams.2.config.heartBeatSeconds;
            alphaPercentPerThousand=createAggregatorParams.2.config.alphaPercentPerThousand;
            decimals=createAggregatorParams.2.config.decimals;
          ]
        ];

        const aggregatorOrigination: (operation * address) = createAggregatorFunc(
            (None: option(key_hash)),
            0tez,
            originatedAggregatorStorage
        );

        s.trackedAggregators := Map.add((createAggregatorParams.0, createAggregatorParams.1), aggregatorOrigination.1, s.trackedAggregators)

    } with(list[aggregatorOrigination.0], s)

function main (const action : templateAction; const s : storage) : return is
    case action of [
      | First (parameters) -> first(parameters, s)
      | CreateAggregator (parameters) -> createAggregator(parameters, s)
    ]