type oracleInformation is [@layout:comb] record [
       oraclePublicKey: key;
       oraclePeerId: string;
];
type oracleAddressesType is map (address, oracleInformation);
type pivotedObservationsType     is map (nat, nat);

type oraclePriceResponseType is [@layout:comb] record [
       priceSalted:     nat * address;
       oracleSignature: signature
];

type leaderReponseType is   [@layout:comb] record [
  oraclePriceResponses: map (address, oraclePriceResponseType);
  signatures: map (address, signature);
];


type storage is [@layout:comb] record [
    oracleAddresses    : oracleAddressesType;
    lastPrice  : nat;
];

type parameter is
  Verify of leaderReponseType
| Reset

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

function verifyAllResponsesSignature(const oracleAddress: address; const oracleSignature: signature; const allReponse: map (address, oraclePriceResponseType); const store: storage): unit is
  if (not check_signature(
      getOraclePublicKey(oracleAddress, store.oracleAddresses), 
      oracleSignature, 
      Bytes.pack(allReponse))) 
      then failwith("wrong signature on all responses signature")
  else unit

function pivotObservationMap (var m : map (address, oraclePriceResponseType)) : pivotedObservationsType is block {
  (*
    Build a map of form:
      observationValue -> observationCount
    from of map of form:
      oracleAddress -> observationValue

    This is useful to compute the median later since
  *)
  var empty : pivotedObservationsType := map [];
  for _key -> value in map m block {
      var temp: nat := getObservationsPriceUtils(value.priceSalted.0, empty);
      empty := Map.update(value.priceSalted.0, Some (temp), empty);
  }
} with (empty)

// Main 

function verify (var store : storage; const leaderReponse : leaderReponseType) : storage is 
  block {

    // verify oracles signatures
    for key -> value in map leaderReponse.signatures block {
        verifyAllResponsesSignature(key, value, leaderReponse.oraclePriceResponses, store)
    };

    // get median
    const median: nat = getMedianFromMap(pivotObservationMap(leaderReponse.oraclePriceResponses), Map.size (leaderReponse.oraclePriceResponses));
    store.lastPrice := median;

  } with (store)

(* Main access point that dispatches to the entrypoints according to
   the smart contract parameter. *)
   
function main (const action : parameter; const store : storage) : return is
 ((nil : list (operation)),    // No operations
  case action of [
    | Verify (msg) -> verify (store, msg)
    | Reset         -> store
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
    lastPrice=2n;
]

*)