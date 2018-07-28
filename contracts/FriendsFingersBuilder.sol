pragma solidity ^0.4.24;

import "./crowdsale/FriendsFingersCrowdsale.sol";


/**
 * @title FriendsFingersBuilder
 */
contract FriendsFingersBuilder is Pausable, SafeContract {
  using SafeMath for uint256;

  event CrowdsaleStarted(address ffCrowdsale);
  event CrowdsaleClosed(address ffCrowdsale);

  uint public version = 1;
  string public website = "https://www.friendsfingers.com";
  uint256 public friendsFingersRatePerMille = 50; //5%
  address public friendsFingersWallet;
  mapping (address => bool) public enabledAddresses;

  uint256 public crowdsaleCount = 0;
  mapping (uint256 => address) public crowdsaleList;
  mapping (address => address) public crowdsaleCreators;

  // TODO replace with RBAC
  modifier onlyOwnerOrEnabledAddress() {
    require(
      enabledAddresses[msg.sender] || msg.sender == owner,
      "Sender must be owner or enable address"
    );
    _;
  }

  modifier onlyOwnerOrCreator(address _ffCrowdsale) {
    require(
      msg.sender == crowdsaleCreators[_ffCrowdsale] || msg.sender == owner,
      "Sender must be owner or crowdsale creator"
    );
    _;
  }

  constructor(address _friendsFingersWallet) public {
    setMainWallet(_friendsFingersWallet);
  }

  /**
   * @notice This is for people who want to donate ETH to FriendsFingers
   */
  function () public payable {
    require(msg.value > 0, "Value must be greater than zero");
    friendsFingersWallet.transfer(msg.value);
  }

  // crowdsale utility methods

  function startCrowdsale(
    string _tokenName,
    string _tokenSymbol,
    uint8 _tokenDecimals,
    uint256 _cap,
    uint256 _goal,
    uint256 _creatorSupply,
    uint256 _openingTime,
    uint256 _closingTime,
    uint256 _rate,
    address _wallet,
    string _crowdsaleInfo
  ) public whenNotPaused returns (FriendsFingersCrowdsale)
  {
    crowdsaleCount++;
    uint256 _round = 1;

    FriendsFingersToken token = new FriendsFingersToken(
      _tokenName,
      _tokenSymbol,
      _tokenDecimals
    );

    if (_creatorSupply > 0) {
      token.mint(_wallet, _creatorSupply);
    }

    FriendsFingersCrowdsale ffCrowdsale = new FriendsFingersCrowdsale(
      crowdsaleCount,
      _cap,
      _goal,
      _openingTime,
      _closingTime,
      _rate,
      _wallet,
      token,
      _crowdsaleInfo,
      _round,
      0,
      friendsFingersRatePerMille,
      friendsFingersWallet
    );

    if (crowdsaleCount > 1) {
      ffCrowdsale.pause();
    }

    token.transferOwnership(address(ffCrowdsale));

    addCrowdsaleToList(address(ffCrowdsale));

    return ffCrowdsale;
  }

  function restartCrowdsale(
    address _ffCrowdsale,
    uint256 _cap,
    uint256 _openingTime,
    uint256 _closingTime,
    uint256 _rate,
    string _crowdsaleInfo
  ) public whenNotPaused onlyOwnerOrCreator(_ffCrowdsale) returns (FriendsFingersCrowdsale)
  {
    FriendsFingersCrowdsale ffCrowdsale = FriendsFingersCrowdsale(_ffCrowdsale);
    require(ffCrowdsale.nextRoundId() == 0, "Can't restart twice");
    require(ffCrowdsale.goalReached(), "Can't restart if goal not reached");
    require(_rate < ffCrowdsale.rate(), "Can't restart if rate greater or equal old rate");

    ffCrowdsale.finalize();

    crowdsaleCount++;
    uint256 _round = ffCrowdsale.round();
    _round++;

    FriendsFingersToken token = ffCrowdsale.token();

    FriendsFingersCrowdsale newFriendsFingersCrowdsale = new FriendsFingersCrowdsale(
      crowdsaleCount,
      _cap,
      0,
      _openingTime,
      _closingTime,
      _rate,
      ffCrowdsale.wallet(),
      token,
      _crowdsaleInfo,
      _round,
      ffCrowdsale.id(),
      friendsFingersRatePerMille,
      friendsFingersWallet
    );

    token.transferOwnership(address(newFriendsFingersCrowdsale));

    ffCrowdsale.setnextRoundId(crowdsaleCount);

    addCrowdsaleToList(address(newFriendsFingersCrowdsale));

    return newFriendsFingersCrowdsale;
  }

  function closeCrowdsale(address _ffCrowdsale) public onlyOwnerOrCreator(_ffCrowdsale) {
    FriendsFingersCrowdsale ffCrowdsale = FriendsFingersCrowdsale(_ffCrowdsale);
    ffCrowdsale.finalize();

    FriendsFingersToken token = ffCrowdsale.token();
    token.finishMinting();
    token.transferOwnership(crowdsaleCreators[_ffCrowdsale]);

    emit CrowdsaleClosed(ffCrowdsale);
  }

  function updateCrowdsaleInfo(address _ffCrowdsale, string _crowdsaleInfo) public onlyOwnerOrCreator(_ffCrowdsale) {
    FriendsFingersCrowdsale ffCrowdsale = FriendsFingersCrowdsale(_ffCrowdsale);
    ffCrowdsale.updateCrowdsaleInfo(_crowdsaleInfo);
  }

  // Only builder owner methods

  function changeEnabledAddressStatus(address _address, bool _status) public onlyOwner {
    require(_address != address(0), "Can't enable the zero wallet");
    enabledAddresses[_address] = _status;
  }

  function setDefaultFriendsFingersRate(uint256 _newFriendsFingersRatePerMille) public onlyOwner {
    require(_newFriendsFingersRatePerMille > 0, "Can't set a value less or equal to zero");
    require(_newFriendsFingersRatePerMille < friendsFingersRatePerMille, "Can't set a value greater than the previous");
    friendsFingersRatePerMille = _newFriendsFingersRatePerMille;
  }

  function setMainWallet(address _newFriendsFingersWallet) public onlyOwner {
    require(_newFriendsFingersWallet != address(0), "Can't be set to the zero wallet");
    friendsFingersWallet = _newFriendsFingersWallet;
  }

  function setFriendsFingersRateForCrowdsale(address _ffCrowdsale, uint256 _newFriendsFingersRatePerMille) public onlyOwner {
    FriendsFingersCrowdsale ffCrowdsale = FriendsFingersCrowdsale(_ffCrowdsale);
    ffCrowdsale.setFriendsFingersRate(_newFriendsFingersRatePerMille);
  }

  function setFriendsFingersWalletForCrowdsale(address _ffCrowdsale, address _newFriendsFingersWallet) public onlyOwner {
    FriendsFingersCrowdsale ffCrowdsale = FriendsFingersCrowdsale(_ffCrowdsale);
    ffCrowdsale.setFriendsFingersWallet(_newFriendsFingersWallet);
  }

  // Emergency methods (only builder owner or enabled addresses)

  function pauseCrowdsale(address _ffCrowdsale) public onlyOwnerOrEnabledAddress {
    FriendsFingersCrowdsale ffCrowdsale = FriendsFingersCrowdsale(_ffCrowdsale);
    ffCrowdsale.pause();
  }

  function unpauseCrowdsale(address _ffCrowdsale) public onlyOwnerOrEnabledAddress {
    FriendsFingersCrowdsale ffCrowdsale = FriendsFingersCrowdsale(_ffCrowdsale);
    ffCrowdsale.unpause();
  }

  function blockCrowdsale(address _ffCrowdsale) public onlyOwnerOrEnabledAddress {
    FriendsFingersCrowdsale ffCrowdsale = FriendsFingersCrowdsale(_ffCrowdsale);
    ffCrowdsale.blockCrowdsale();
  }

  function safeTokenWithdrawalFromCrowdsale(address _ffCrowdsale, address _tokenAddress, uint256 _tokens) public onlyOwnerOrEnabledAddress {
    FriendsFingersCrowdsale ffCrowdsale = FriendsFingersCrowdsale(_ffCrowdsale);
    ffCrowdsale.transferAnyERC20Token(_tokenAddress, _tokens, friendsFingersWallet);
  }

  function safeWithdrawalFromCrowdsale(address _ffCrowdsale) public onlyOwnerOrEnabledAddress {
    FriendsFingersCrowdsale ffCrowdsale = FriendsFingersCrowdsale(_ffCrowdsale);
    ffCrowdsale.safeWithdrawal();
  }

  function setExpiredAndWithdraw(address _ffCrowdsale) public onlyOwnerOrEnabledAddress {
    FriendsFingersCrowdsale ffCrowdsale = FriendsFingersCrowdsale(_ffCrowdsale);
    ffCrowdsale.setExpiredAndWithdraw();
  }

  // Internal methods

  function addCrowdsaleToList(address ffCrowdsale) internal {
    crowdsaleList[crowdsaleCount] = ffCrowdsale;
    crowdsaleCreators[ffCrowdsale] = msg.sender;

    emit CrowdsaleStarted(ffCrowdsale);
  }

}
