pragma solidity ^0.4.24;

import "./base/BaseToken.sol";


/**
 * @title FriendsFingersToken
 */
contract FriendsFingersToken is BaseToken {

  address public builder;

  constructor(
    string _name,
    string _symbol,
    uint8 _decimals
  )
    public
    BaseToken (_name, _symbol, _decimals)
  {
    builder = owner;
  }
}
