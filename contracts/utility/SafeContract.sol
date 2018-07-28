pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Basic.sol";


contract SafeContract is Ownable {

  /**
   * @notice Owner can transfer out any accidentally sent ERC20 tokens
   */
  function transferAnyERC20Token(address _tokenAddress, uint256 _tokens, address _beneficiary) public onlyOwner returns (bool success) {
    return ERC20Basic(_tokenAddress).transfer(_beneficiary, _tokens);
  }
}
