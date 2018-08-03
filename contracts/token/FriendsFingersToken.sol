pragma solidity ^0.4.24;

import "./../utility/ContractReceiverInterface.sol";
import "./../utility/SafeContract.sol";
import "openzeppelin-solidity/contracts/token/ERC20/DetailedERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/BurnableToken.sol";
import "openzeppelin-solidity/contracts/token/ERC20/MintableToken.sol";


/**
 * @title FriendsFingersToken
 */
// solium-disable-next-line max-len
contract FriendsFingersToken is DetailedERC20, MintableToken, BurnableToken, SafeContract {

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

  function approveAndCall(
    address _spender,
    uint256 _amount,
    bytes _extraData
  )
    public
    returns (bool success)
  {
    require(approve(_spender, _amount), "Spender must be approved");

    ContractReceiverInterface(_spender).receiveApproval(
      msg.sender,
      _amount,
      this,
      _extraData
    );

    return true;
  }

}
