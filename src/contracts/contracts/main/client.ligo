type lastCompletedRoundPriceReturnType is
  record [
    round: int;
    price: int;
    percentOracleResponse: nat;
    decimals: int;
  ];


const noOperations : list (operation) = nil;
type storage is record [
  address: address;
  lastprices: lastCompletedRoundPriceReturnType;
]
type return is list (operation) * storage

type parameter is contract(lastCompletedRoundPriceReturnType)

type action is
  | GetPrice of unit


function get_getLastCompletedRoundPrice_entrypoint (const addr : address) is
block {
  const entrypoint : option (contract (parameter))
  = Tezos.get_entrypoint_opt ("%getLastCompletedRoundPrice", addr)
} with
    case entrypoint of [
      Some (contract) -> contract
    | None -> (failwith ("The entrypoint does not exist") : contract (parameter))
    ]

(* Entry Points*)

function getPrice(const _ : unit; const store: storage): return is
block {
  const price : option(lastCompletedRoundPriceReturnType) = Tezos.call_view ("lastCompletedRoundPrice", unit, store.address);

  const unpacked = case price of
    Some (p) -> p
  | None -> (failwith ("No round here") : lastCompletedRoundPriceReturnType)
  end

} with (noOperations, store with record[lastprices=unpacked])

function main (const action : action; const storage : storage) : list(operation) * storage is
  case action of
  | GetPrice (c) -> getPrice(c, storage)
  end;
