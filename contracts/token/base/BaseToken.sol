pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/DetailedERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/MintableToken.sol";
import "openzeppelin-solidity/contracts/token/ERC20/BurnableToken.sol";
import "erc-payable-token/contracts/token/ERC1363/ERC1363BasicToken.sol";
import "eth-token-recover/contracts/TokenRecover.sol";


// solium-disable-next-line max-len
contract BaseToken is DetailedERC20, MintableToken, BurnableToken, ERC1363BasicToken, TokenRecover {

  modifier canTransfer() {
    require(
      mintingFinished,
      "Minting should be finished before transfer."
    );
    _;
  }

  constructor(string _name, string _symbol, uint8 _decimals)
  DetailedERC20(_name, _symbol, _decimals)
  public
  {}

  function transfer(
    address _to,
    uint256 _value
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
    uint256 _value
  )
  public
  canTransfer
  returns (bool)
  {
    return super.transferFrom(_from, _to, _value);
  }
}
