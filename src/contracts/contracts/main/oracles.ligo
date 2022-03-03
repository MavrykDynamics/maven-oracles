type id is int;
type observationsByAddressDataType is map (address, int);
type observationsByAddressType is map (int, observationsByAddressDataType);
type observationsByPriceDataType is map (int, int);
type observationsByPriceType is map (int, observationsByPriceDataType);
type whiteListedContractType is map (address, bool);
type lastCompletedRoundPriceType is
  record [
    round: int;
    price: int;
    percentOracleResponse: nat;
    decimals: int;
  ];
type setObservationType is 
  record [
    roundId: int;
    price: int;
  ];
type ownerType is address;

type storage is
  record [
    whiteListedContract: whiteListedContractType;
    round: int;
    decimals: int;
    percentOracleTrust: nat;
    lastCompletedRoundPrice: lastCompletedRoundPriceType;
    observations: observationsByAddressType;
    owner: ownerType;
  ];

type return is list (operation) * storage
const noOperations : list (operation) = nil;
type isWhiteListedContractParams is address
type updateWhiteListedContractParams is address
type requestRateUpdateParams is unit
type setObservationParams is setObservationType

type action is
    AddWhiteListedContract of updateWhiteListedContractParams
  | RemoveWhiteListedContract of updateWhiteListedContractParams
  | RequestRateUpdate of requestRateUpdateParams
  | SetObservation of setObservationParams

(* Internal Fonctions *)

function isWhiteListedContractPresent(const contractAddress: address; const whiteListedContract: whiteListedContractType): bool is
  Map.mem(contractAddress, whiteListedContract)

function checkOwnership(const store: storage): unit is
  if Tezos.sender =/= store.owner then failwith("Only owner can do this action")
  else unit

function checkIfWhiteListed(const store: storage): unit is
  if not Map.mem(Tezos.sender, store.whiteListedContract) then failwith("Only authorized oracle contract can do this action")
  else unit

function checkIfCorrectRound(const round: int; const store: storage): unit is
  if round =/= store.round then failwith("Wrong round number")
  else unit

function checkIfEnoughObservationForRound(const round: int; const store: storage): bool is
  if round =/= store.round then True
  else False

function getObservationsData(const round: int; const observations: observationsByAddressType) : observationsByAddressDataType is
  case Map.find_opt(round, observations) of
    Some (v) -> v
  | None -> (failwith ("No round here") : observationsByAddressDataType)
  end

function checkIfOracleAlreadyAnswered(const round: int; const store: storage): unit is
  if (Map.mem(Tezos.sender, getObservationsData(round, store.observations))) then failwith("Wrong round number")
  else unit

function getObservationsPrice(const price: int; const myMap: observationsByPriceDataType) : int is
  case Map.find_opt(price, myMap) of
    Some (v) -> (v+1)
  | None -> 1
  end

function mapToMap (var m : observationsByAddressDataType) : observationsByPriceDataType is block {
  var empty : observationsByPriceDataType := map [];
  for _key -> value in map m block {
      var temp: int := getObservationsPrice(value, empty);
      empty := Map.update(value, Some (temp), empty);
  }
} with (empty)


function getMedianFromMap (var m : observationsByPriceDataType; const sizeMap: nat) : int is block {
  const isEven: bool = (sizeMap mod 2n) = 0n;  
  const medianIndex: nat = (sizeMap / 2n);
  var indexLoop: nat := 0n;
  var median: int := 0;
  if isEven then {
    for key -> _value in map m block {
      if (abs (indexLoop - 1n) = medianIndex) then median := key else if (indexLoop = medianIndex) then median := (median + key) / 2n else median := median;
      indexLoop := indexLoop + 1n;
    }
  } else {
    for key -> _value in map m block {
      if (indexLoop = medianIndex) then median := key else median := median;
      indexLoop := indexLoop + 1n;
    }
  }
} with (median)

(* Entry Points*)

function addWhiteListedContract(const contractAddress: address; const store: storage): return is
  if isWhiteListedContractPresent(contractAddress, store.whiteListedContract) then failwith ("You can't add an already present whitelisted contract")
  else block{
    checkOwnership(store);
    const updatedWhiteListedContract: whiteListedContractType = Map.update(contractAddress, Some( True), store.whiteListedContract);
  } with (noOperations, store with record[whiteListedContract=updatedWhiteListedContract])

function removeWhiteListedContract(const contractAddress: address; const store: storage): return is
  if not isWhiteListedContractPresent(contractAddress, store.whiteListedContract) then failwith ("You can't remove a not present whitelisted contract")
  else block{
    checkOwnership(store);
    const updatedWhiteListedContract: whiteListedContractType = Map.remove(contractAddress, store.whiteListedContract);
  } with (noOperations, store with record[whiteListedContract=updatedWhiteListedContract])

function requestRateUpdate(const store: storage): return is
  block{
    checkOwnership(store);
    const newRound: int = store.round + 1;
    const emptyMap : observationsByAddressDataType = map [];
    const updatedObservations: observationsByAddressType = Map.add(( newRound ), emptyMap, store.observations);
  } with (noOperations, store with record[round=newRound; observations=updatedObservations])

function setObservation(const params: setObservationType; const store: storage): return is
  block{
   checkIfWhiteListed(store);
   checkIfCorrectRound(params.roundId, store);
   checkIfOracleAlreadyAnswered(params.roundId, store);

   const observationsDataUpdated: observationsByAddressDataType = Map.update(( Tezos.sender ), Some( params.price ), getObservationsData(store.round, store.observations));
   const updatedObservations: observationsByAddressType = Map.update(( params.roundId ), Some( observationsDataUpdated ), store.observations);
   const oracleWhiteListedSize: nat = Map.size (store.whiteListedContract);
   const numberOfObservationForRound: nat = Map.size (getObservationsData(store.round, updatedObservations));

   var newLastCompletedRoundPrice := store.lastCompletedRoundPrice;
   if (numberOfObservationForRound >= (oracleWhiteListedSize * store.percentOracleTrust / abs (100))) then {
    const median: int = getMedianFromMap(mapToMap(observationsDataUpdated), numberOfObservationForRound);
    newLastCompletedRoundPrice := record [
    round= store.round;
    price= median;
    percentOracleResponse= numberOfObservationForRound / oracleWhiteListedSize * 100n;
    decimals= store.decimals;
    ];
   } else skip 
  } with (noOperations, store with record[observations=updatedObservations; lastCompletedRoundPrice = newLastCompletedRoundPrice])

 (* TODO: getLastPrice entrypoint *)

function main (const action : action; const storage : storage) : list(operation) * storage is
  case action of
  | AddWhiteListedContract(c) -> addWhiteListedContract(c, storage)
  | RemoveWhiteListedContract(c) -> removeWhiteListedContract(c, storage)
  | RequestRateUpdate(_u) -> requestRateUpdate(storage)
  | SetObservation(params) -> setObservation(params, storage)
  end;

(*
To add as STORAGE field to deplopy on https://ide.ligolang.org/ 

record [
  whiteListedContract=map[
    (("tz1KqTpEZ7Yob7QbPE4Hy4Wo8fHG8LhKxZSx" : address)) -> True;
    (("tz1e3CMVjAUZF1CbbnSZXhAae5fFxDdc6pSh" : address)) -> True;
    (("tz1ihvnEowDw3xZ96jVRJpsdMCZVo59Cbmoa" : address)) -> True
    ];
  round=0;
  decimals=8;
  percentOracleTrust=100n;
  lastCompletedRoundPrice=record [
      round= 0; 
      price= 0; 
      percentOracleResponse= 0n; 
      decimals=8;
      ];
  owner= ("tz1e3CMVjAUZF1CbbnSZXhAae5fFxDdc6pSh": address);
  observations=map[
    0 -> 
      map[
    ("tz1KqTpEZ7Yob7QbPE4Hy4Wo8fHG8LhKxZSx" : address) -> 0]   
    ];
]

*)
