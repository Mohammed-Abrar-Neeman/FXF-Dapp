// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.22;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract FxF is ERC20, Ownable {
    constructor(address initialOwner)
        ERC20("Fast & Furious", "FxF")
        Ownable(initialOwner)
    {
        _mint(initialOwner, 1_000_000_000 * 10 ** 18);
    }
}
