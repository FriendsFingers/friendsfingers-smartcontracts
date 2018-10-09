pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/DetailedERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/BurnableToken.sol";
import "openzeppelin-solidity/contracts/token/ERC20/MintableToken.sol";
import "erc-payable-token/contracts/token/ERC1363/ERC1363BasicToken.sol";
import "eth-token-recover/contracts/TokenRecover.sol";


/**
 * @title FriendsFingersToken
 */
// solium-disable-next-line max-len
contract FriendsFingersToken is DetailedERC20, MintableToken, BurnableToken, ERC1363BasicToken, TokenRecover {

  address public builder;

  modifier canTransfer() {
    require(mintingFinished, "Minting must be finished");
    _;
  }

  constructor(
    string _name,
    string _symbol,
    uint8 _decimals
  )
    public
    DetailedERC20 (_name, _symbol, _decimals)
  {
    builder = owner;
  }

  function transfer(
    address _to,
    uint _value
  )
    public
    canTransfer
    returns (bool)
  {
    return super.transfer(_to, _value);
  }

  function transferFrom(
    address _from,
    address _to,
    uint _value
  )
    public
    canTransfer
    returns (bool)
  {
    return super.transferFrom(_from, _to, _value);
  }
}
