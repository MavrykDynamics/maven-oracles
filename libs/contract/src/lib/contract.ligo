type oracleAddressesType is map (address, key);
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
      Some (v) -> (v)
    | None -> failwith("fail to get oracle public key")
  ]

function check_signature
    (const pk     : key;
     const signed : signature;
     const msg    : bytes) : bool
  is Crypto.check (pk, signed, msg)


function verifyOraclePriceResponseSignature (const store : storage; const oraclePriceResponse : oraclePriceResponseType) : unit is block {
    // const price: nat = oraclePriceResponse.priceSalted.0; 
    const oracleAddress: address = oraclePriceResponse.priceSalted.1;
    const oracleSignature: signature = oraclePriceResponse.oracleSignature;

    // get oracle public key + verify in the oracles map
    const publicKey: key =  getOraclePublicKey(oracleAddress, store.oracleAddresses);
    if (not check_signature(publicKey, oracleSignature, Bytes.pack(oraclePriceResponse.priceSalted)))
    then failwith("wrong signature on oracle price response")
    else skip;
 } with (unit)

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

    // verify oracles price answers
    for _key -> value in map leaderReponse.oraclePriceResponses block {
        verifyOraclePriceResponseSignature(store, value)
    };

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
    ("tz1VSUr8wwNhLAzempoch5d6hLRiTh8Cjcjb":address) -> ("edpkvGfYw3LyB1UcCahKQk4rF2tvbMUk8GFiTuMjL75uGXrpvKXhjn":key);
    ("tz1aSkwEot3L2kmUvcoxzjMomb9mvBNuzFK6":address) -> ("edpkurPsQ8eUApnLUJ9ZPDvu98E8VNj4KtJa1aZr16Cr5ow5VHKnz4":key);
    ("tz1MnmtP4uAcgMpeZN6JtyziXeFqqwQG6yn6":address) -> ("edpku9qEgcyfNNDK6EpMvu5SqXDqWRLuxdMxdyH12ivTUuB1KXfGP4":key);  
];
  lastPrice=2n;
]
*)
