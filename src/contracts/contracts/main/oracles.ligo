type id is int;
type roundResultType is big_map ((int * address), int);
type whiteListedContractType is big_map (address, bool);
type roundResultResponse is
  record [
    round: bytes;
    price: int;
    percentOracleResponse: int;
  ];
type ownerType is address;

type storage is
  record [
    whiteListedContract: whiteListedContractType;
    round: int;
    percentOracleTrust: int;
    roundResult: roundResultType;
    owner: ownerType;
  ];

type isWhiteListedContractParams is address
type updateWhiteListedContractParams is address
const noOperations : list (operation) = nil;
type return is list (operation) * storage
type getTotalSupplyParams is contract(int)

type action is
    AddWhiteListedContract of updateWhiteListedContractParams
  | RemoveWhiteListedContract of updateWhiteListedContractParams

function isWhiteListedContractPresent(const contractAddress: address; const whiteListedContract: whiteListedContractType): bool is
  Big_map.mem(contractAddress, whiteListedContract)

function checkOwnership(const owner: ownerType): unit is
  if Tezos.sender =/= owner then failwith("Only owner can do this action")
  else unit

function addWhiteListedContract(const contractAddress: address; const store: storage): return is
  if isWhiteListedContractPresent(contractAddress, store.whiteListedContract) then failwith ("You can't add an already present whitelisted contract")
  else block{
    checkOwnership(store.owner);
    const updatedWhiteListedContract: whiteListedContractType = Big_map.update(contractAddress, Some( True), store.whiteListedContract);
  } with (noOperations, store with record[whiteListedContract=updatedWhiteListedContract])

function removeWhiteListedContract(const contractAddress: address; const store: storage): return is
  if not isWhiteListedContractPresent(contractAddress, store.whiteListedContract) then failwith ("You can't remove a not present whitelisted contract")
  else block{
    checkOwnership(store.owner);
    const updatedWhiteListedContract: whiteListedContractType = Big_map.remove(contractAddress, store.whiteListedContract);
  } with (noOperations, store with record[whiteListedContract=updatedWhiteListedContract])

function main (const action : action; const storage : storage) : list(operation) * storage is
  case action of
 (* | IsWhiteListedContract(c) -> isWhiteListedContract(c, storage)*)
  | AddWhiteListedContract(c) -> addWhiteListedContract(c, storage)
  | RemoveWhiteListedContract(c) -> removeWhiteListedContract(c, storage)
  end;


(*
To add as STORAGE field to deplopy on https://ide.ligolang.org/ 

record [
  whiteListedContract=big_map[
    (("tz1KqTpEZ7Yob7QbPE4Hy4Wo8fHG8LhKxZSx" : address)) -> True];
  round=1;
  percentOracleTrust=1;
  owner= ("tz1e3CMVjAUZF1CbbnSZXhAae5fFxDdc6pSh": address);
  roundResult=big_map[
    (0, ("tz1KqTpEZ7Yob7QbPE4Hy4Wo8fHG8LhKxZSx" : address)) -> 0];
]
*)