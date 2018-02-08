pragma solidity ^0.4.19;

import "zeppelin-solidity/contracts/token/ERC20/StandardToken.sol";


//used for test
contract ContractReceiverImpl {
    bytes public data;

    function ContractReceiverImpl() public {}

    function receiveApproval(
        address from,
        uint256 _amount,
        address _token,
        bytes _data) public
    {
        StandardToken token = StandardToken(_token);
        token.transferFrom(from, this, _amount);
        data = _data;
    }
}