type oracleInformation is [@layout:comb] record [
       oraclePublicKey: key;
       oraclePeerId: string;
];
type oracleAddressesType is map (address, oracleInformation);
type pivotedObservationsType     is map (nat, nat);

type oracleObservationType is [@layout:comb] record [
       price: nat;
       epoch: nat;
       round: nat;
];

type oracleLastResultType is [@layout:comb] record [
       price: nat;
       epoch: nat;
       round: nat;
       time: timestamp;
];


type leaderReponseType is   [@layout:comb] record [
  oracleObservations: map (address, oracleObservationType);
  signatures: map (address, signature);
];

type storage is [@layout:comb] record [
    oracleAddresses    : oracleAddressesType;
    lastResult  : oracleLastResultType;
    heartBeatSeconds : nat;
    alphaPercentPerThousand : nat;
    decimals : nat;
];

type parameter is
  Verify of leaderReponseType
  | Reset
  | Unknown

type return is list (operation) * storage

// Helpers

function getObservationsPriceUtils(const price: nat; const myMap: pivotedObservationsType) : nat is
  case Map.find_opt(price, myMap) of [
      Some (v) -> (v+1n)
    | None -> 1n
  ]

function getMedianFromMap (var m : pivotedObservationsType; const sizeMap: nat) : nat is block {
  (*
    m is a map: observationValue -> observationCount, sorted by observation value
    Example:
      Observations are: 10, 10, 20, 30, 30, 40. The map will be:
      10 -> 2
      20 -> 1
      30 -> 2
      40 -> 1

    We want to extract the median of observation values.

    Since we know the number of observation (in the example: 6),
    we can iterate through the map while keeping a count of the passed observation count. This way, we know when we will hit the intresting values
    (n/2 for odd observation count, n/2 and n/2 + 1 for even observation)

    For the example above, we want to average the 3rd (6/2) and 4th (6/2 + 1) value.
    So we go though the map and accumulate the observation count:

    1st loop iteration (10 -> 2):
      // Nothing to do, no intresting values
      accumulator = 2

    2nd loop iteration (20 -> 1):
      // We have hit the first interesting value !
      median = 20 (first part of the median)
      accumulator = 3 (2 + 1)

    3rd loop iteration (30 -> 2)
      // We have hit the second interesting value!
      // Compute the median with the first part of the median:
      median = (median + 30) / 2
      accumulator = 5 (3 + 2)

    4rd loop iteration (40 -> 1)
      // Nothing to do, intresting values have already passed
      accumulator = 6 (5 + 1)

    The logic remains the same for odd number of observation, we just have to save one value
   *)

  const isEven: bool = (sizeMap mod 2n) = 0n;
  const medianIndex: nat = (sizeMap / 2n);
  var _observationCountAccumulator: nat := 0n;
  var median: nat := 0n;

  for observationValue -> observationCount in map m block {
    if isEven then {
      if (medianIndex >= _observationCountAccumulator + 1n and medianIndex < _observationCountAccumulator + observationCount + 1n) then
        median := observationValue
      else
        skip;

      if (medianIndex >= _observationCountAccumulator and medianIndex < _observationCountAccumulator + observationCount) then
        median := (median + observationValue) / 2n
      else
        skip;

    } else {
      if (medianIndex >= _observationCountAccumulator and medianIndex < _observationCountAccumulator + observationCount) then
        median := observationValue
      else
        skip;
    };

    _observationCountAccumulator := _observationCountAccumulator + observationCount;
  }
} with (median)

function getOraclePublicKey(const addressKey: address; const oracleAddresses: oracleAddressesType) : key is
  case Map.find_opt(addressKey, oracleAddresses) of [
      Some (v) -> (v.oraclePublicKey)
    | None -> failwith("fail to get oracle public key")
  ]

function check_signature
    (const pk     : key;
     const signed : signature;
     const msg    : bytes) : bool
  is Crypto.check (pk, signed, msg)

function verifyAllResponsesSignature(const oracleAddress: address; const oracleSignatures: signature; const oracleObservations: map (address, oracleObservationType); const store: storage): unit is
  if (not check_signature(
      getOraclePublicKey(oracleAddress, store.oracleAddresses), 
      oracleSignatures, 
      Bytes.pack(oracleObservations))) 
      then failwith("wrong signature on observation signatures")
  else unit

function pivotObservationMap (var m : map (address, oracleObservationType)) : pivotedObservationsType is block {
  (*
    Build a map of form:
      observationValue -> observationCount
    from of map of form:
      oracleAddress -> observationValue

    This is useful to compute the median later since
  *)
  var empty : pivotedObservationsType := map [];
  for _key -> value in map m block {
      var temp: nat := getObservationsPriceUtils(value.price, empty);
      empty := Map.update(value.price, Some (temp), empty);
  }
} with (empty)

function verifyMapsSizes(const leaderReponse : leaderReponseType): unit is
  if (not (Map.size(leaderReponse.oracleObservations) = Map.size(leaderReponse.signatures)))
      then failwith("map observations and map signatures should have the same size")
  else unit

function verifyEpochAndRoundFromObservation(const oracleObservations: map (address, oracleObservationType); const store: storage): (nat * nat) is block {
  var epoch: nat := 0n;
  var round: nat := 0n;

  for _key -> value in map oracleObservations block {
      if (epoch = 0n) then epoch:= value.epoch;
      if (not (epoch = value.epoch)) then failwith("different epoch in the observations");

      if (round = 0n) then round:= value.round;
      if (not (round = value.round)) then failwith("different round in the observations");
  };

  if (epoch < store.lastResult.epoch) then failwith("epoch should be smaller than previous result")
  else if (epoch = store.lastResult.epoch) then {
    if (round <= store.lastResult.epoch) then failwith("round should be smaller than previous result")
    else skip;
  }
  else skip;
} with (epoch, round)




// Main 

function verify (var store : storage; const leaderReponse : leaderReponseType) : storage is 
  block {

    // verify obervations and signatures have the same size
    verifyMapsSizes(leaderReponse);
    // verify for each observations -> epoch and round are the same + different from previous
    var epochAndRound: nat*nat := verifyEpochAndRoundFromObservation(leaderReponse.oracleObservations, store);

    // verify oracles signatures
    for key -> value in map leaderReponse.signatures block {
        verifyAllResponsesSignature(key, value, leaderReponse.oracleObservations, store)
    };

    // get median
    const median: nat = getMedianFromMap(pivotObservationMap(leaderReponse.oracleObservations), Map.size (leaderReponse.oracleObservations));
    store.lastResult := record[
      price=median;
      epoch=epochAndRound.0;
      round=epochAndRound.1;
      time=Tezos.get_now();
    ];

  } with (store)

// reset epoch and round - FOR TESTING
function reset (var store : storage) : storage is 
  block {
    store.lastResult := record[
      price=0n;
      epoch=0n;
      round=0n;
      time=Tezos.get_now();
    ];

  } with (store)

(* Main access point that dispatches to the entrypoints according to
   the smart contract parameter. *)
   
function main (const action : parameter; const store : storage) : return is
 ((nil : list (operation)),    // No operations
  case action of [
    | Verify (msg)  -> verify (store, msg)
    | Reset         -> reset (store)
    | Unknown       -> store
  ])

(*
STORAGE:

record [
  oracleAddresses=map[
    ("tz1eAoFgsys8PhTUvT3V3eq2BFaZp8UsGNsr":address) -> record[
        oraclePublicKey=("edpkv9DgHWm6HY6b35Mv77hgZcWrJVD4ADebp9RjYxXVmFvGs4VYi1" : key);
        oraclePeerId=("12D3KooWJQWBQvefFGj3uAzKGhpZYWYGKtj2fNQAG47aov4uj9p1" : string);
        ];

    ("tz1MBNfBnNn8fZCJVrrXV95FSgyuUxbmt3Mm":address) -> record[
        oraclePublicKey=("edpkunKYLbEfRLKLtn9yi9avyjQbAAbQxuPVN759ajQEDKpp4RE6GV" : key);
        oraclePeerId=("12D3KooWBpgAXhUAgjPAwEk5FJ9DRB2kFbuj8KLkPPmqKKmzrXz2" : string);
    ];

    ("tz1PSmvRd3ySbh5aviFEMYGD6542LL5QnrMk":address) -> record[
        oraclePublicKey=("edpkuVjyKad7yCnNrCbGea7hi5Zh1zp5Cb1TvxUmnxC33fwKhq7daN" : key);
        oraclePeerId=("12D3KooWLL2Y1JmrAXkY7r8xbuSRtasfJLAarXmAaZPYxPnzgAJ3" : string);
    ];

    ("tz1KrELvNVY4xKnujkXwrVLWuzWJEg9FvA8v":address) -> record[
        oraclePublicKey=("edpku7vkvS6XaWzFjmPDYULNyYrS7Rf1vHuoQ9FD8zVcaFNJ51bJ82" : key);
        oraclePeerId=("12D3KooWK87KmBGJZZMP3keux62VF515mFRbNRFwbYxib7wWQR34" : string);
    ];

    ("tz1YKquTvvSE2B5kvGyf1AYeXD6b6cMDSzDe":address) -> record[
        oraclePublicKey=("edpkuqoXhgeXYZxn6yVWuy9UrWKazyahPaAbwnuZYknRefeLVVK3ar" : key);
        oraclePeerId=("12D3KooWDgabT39cFp5j5mvJgiGPEppMuVgDCsNtBCh1Q8ejBCA5" : string);
    ];

    ("tz1TQ4fpSFNZ6D9vrcwBz9yzM2SNjDj5YoU7":address) -> record[
        oraclePublicKey=("edpkv6xHMqShSMr4CK3Vzg7mD1hina7eBkokrMoKpuYj55BVd18rjN" : key);
        oraclePeerId=("12D3KooWEKXXjviRoWwoB37UzBT4qjUBbQH8bypWy3YWmyfvR736" : string);
    ];

    ("tz1bPLbmiseCCWtW7RZ9t2RkNyboB9XT4exJ":address) -> record[
        oraclePublicKey=("edpku8MxEyEKHPsPeUBSBz5a5QbemdPbiQVsobdC3SnC9UDf4yMHTL" : key);
        oraclePeerId=("12D3KooWRGcN9uh633ucfUJ3XQ69n31mB2jPHKtrw7mfCSJdLz97" : string);
    ];
    ];
    lastResult=record[
      price=(0n : nat);
      epoch=(0n : nat);
      round=(0n : nat);
      time=(1657704105 : timestamp);
      ];
    decimals=(8n : nat);
    heartBeatSeconds=(60n : nat);
    alphaPercentPerThousand=(500n : nat);
]

*)


// FOR DEMO - 4 oracles

(*
record [
  oracleAddresses=map[
    ("tz1eAoFgsys8PhTUvT3V3eq2BFaZp8UsGNsr":address) -> record[
        oraclePublicKey=("edpkv9DgHWm6HY6b35Mv77hgZcWrJVD4ADebp9RjYxXVmFvGs4VYi1" : key);
        oraclePeerId=("12D3KooWJQWBQvefFGj3uAzKGhpZYWYGKtj2fNQAG47aov4uj9p1" : string);
        ];

    ("tz1PSmvRd3ySbh5aviFEMYGD6542LL5QnrMk":address) -> record[
        oraclePublicKey=("edpkuVjyKad7yCnNrCbGea7hi5Zh1zp5Cb1TvxUmnxC33fwKhq7daN" : key);
        oraclePeerId=("12D3KooWLL2Y1JmrAXkY7r8xbuSRtasfJLAarXmAaZPYxPnzgAJ3" : string);
    ];

    ("tz1KrELvNVY4xKnujkXwrVLWuzWJEg9FvA8v":address) -> record[
        oraclePublicKey=("edpku7vkvS6XaWzFjmPDYULNyYrS7Rf1vHuoQ9FD8zVcaFNJ51bJ82" : key);
        oraclePeerId=("12D3KooWK87KmBGJZZMP3keux62VF515mFRbNRFwbYxib7wWQR34" : string);
    ];

    ("tz1YKquTvvSE2B5kvGyf1AYeXD6b6cMDSzDe":address) -> record[
        oraclePublicKey=("edpkuqoXhgeXYZxn6yVWuy9UrWKazyahPaAbwnuZYknRefeLVVK3ar" : key);
        oraclePeerId=("12D3KooWDgabT39cFp5j5mvJgiGPEppMuVgDCsNtBCh1Q8ejBCA5" : string);
    ];
    ];
    lastResult=record[
      price=(0n : nat);
      epoch=(0n : nat);
      round=(0n : nat);
      time=(1657704105 : timestamp);
      ];
    decimals=(8n : nat);
    heartBeatSeconds=(60n : nat);
    alphaPercentPerThousand=(500n : nat);
]
*)