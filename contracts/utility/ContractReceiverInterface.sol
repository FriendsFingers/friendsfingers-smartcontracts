pragma solidity ^0.4.24;


contract ContractReceiverInterface {
  function receiveApproval(
    address from,
    uint256 _amount,
    address _token,
    bytes _data) public;
}
