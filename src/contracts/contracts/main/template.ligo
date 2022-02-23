type storage is record [
    admin                       : address;
]

type templateAction is 
    | First of (nat)
    | Second of (nat)

const noOperations : list (operation) = nil;
type return is list (operation) * storage

function first(const _proposal : nat ; var s : storage) : return is 
block {
    // Steps Overview:
    // 1. 
    // 2. 
    skip

} with (noOperations, s)

function second(const _parameters : nat; var s : storage) : return is 
block {
    // Steps Overview:
    // 1. 
    // 2.
    
    skip
} with (noOperations, s)

function main (const action : templateAction; const s : storage) : return is 
    case action of
        | First(parameters) -> first(parameters, s)
        | Second(parameters) -> second(parameters, s)
    end