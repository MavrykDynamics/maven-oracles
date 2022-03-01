type id is int;
(*type observationsType is map ((int * address), int);*)
type observationsDataType is map (address, int);
type observationsType is map (int, observationsDataType);

type whiteListedContractType is map (address, bool);
type roundResultResponse is
  record [
    round: bytes;
    price: int;
    percentOracleResponse: int;
  ];
type ownerType is address;
type setObservationType is 
  record [
    roundId: int;
    price: int;
  ];

type storage is
  record [
    whiteListedContract: whiteListedContractType;
    round: int;
    percentOracleTrust: int;
    observations: observationsType;
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
  if not Map.mem(Tezos.sender, store.whiteListedContract) then failwith("Only owner can do this action")
  else unit

function checkIfCorrectRound(const round: int; const store: storage): unit is
  if round =/= store.round then failwith("Wrong round number")
  else unit

function checkIfEnoughObservationForRound(const round: int; const store: storage): bool is
  if round =/= store.round then True
  else False

function getObservationsData(const store : storage) : observationsDataType is
  case Map.find_opt(store.round, store.observations) of
    Some (v) -> v
  | None -> (failwith ("No round here") : observationsDataType)
  end

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
    const emptyMap : observationsDataType = map [];
    const updatedObservations: observationsType = Map.add(( newRound ), emptyMap, store.observations);
  } with (noOperations, store with record[round=newRound; observations=updatedObservations])

function setObservation(const params: setObservationType; const store: storage): return is
  block{
    checkIfWhiteListed(store);
    checkIfCorrectRound(params.roundId, store);
   const observationsDataUpdated: observationsDataType = Map.update(( Tezos.sender ), Some( params.price ), getObservationsData(store));
   const updatedObservations: observationsType = Map.update(( params.roundId ), Some( observationsDataUpdated ), store.observations);
  
  (* TODO:  if (enoughObservationForRound(roundId)) { setRoundAsComplete(roundId) } *)
  } with (noOperations, store with record[observations=updatedObservations])

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
    (("tz1KqTpEZ7Yob7QbPE4Hy4Wo8fHG8LhKxZSx" : address)) -> True];
  round=0;
  percentOracleTrust=1;
  owner= ("tz1e3CMVjAUZF1CbbnSZXhAae5fFxDdc6pSh": address);
  observations=map[
    0 -> 
      map[
    ("tz1KqTpEZ7Yob7QbPE4Hy4Wo8fHG8LhKxZSx" : address) -> 0]   
    ];
]

*)