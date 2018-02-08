pragma solidity ^0.4.19;

import "./../utility/ContractReceiverInterface.sol";
import "./../utility/SafeContract.sol";
import "zeppelin-solidity/contracts/token/ERC20/DetailedERC20.sol";
import "zeppelin-solidity/contracts/token/ERC20/BurnableToken.sol";
import "zeppelin-solidity/contracts/token/ERC20/MintableToken.sol";


/**
 * @title FriendsFingersToken
 */
contract FriendsFingersToken is DetailedERC20, MintableToken, BurnableToken, SafeContract {

    address public builder;

    modifier canTransfer() {
        require(mintingFinished);
        _;
    }

    function FriendsFingersToken(
        string _name,
        string _symbol,
        uint8 _decimals
    )
    DetailedERC20 (_name, _symbol, _decimals)
    public
    {
        builder = owner;
    }

    function transfer(address _to, uint _value) canTransfer public returns (bool) {
        return super.transfer(_to, _value);
    }

    function transferFrom(address _from, address _to, uint _value) canTransfer public returns (bool) {
        return super.transferFrom(_from, _to, _value);
    }

    /**
     * @notice `msg.sender` approves `_spender` to send `_amount` tokens on
     * its behalf, and then a function is triggered in the contract that is
     * being approved, `_spender`. This allows users to use their tokens to
     * interact with contracts in one function call instead of two
     * @param _spender The address of the contract able to transfer the tokens
     * @param _amount The amount of tokens to be approved for transfer
     * @return True if the function call was successful
     */
    function approveAndCall(address _spender, uint256 _amount, bytes _extraData) public returns (bool success) {
        require(approve(_spender, _amount));

        ContractReceiverInterface(_spender).receiveApproval(
            msg.sender,
            _amount,
            this,
            _extraData
        );

        return true;
    }

}
