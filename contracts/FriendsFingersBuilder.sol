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

  modifier onlyOwnerOrCreator(address _ffc) {
    require(
      msg.sender == crowdsaleCreators[_ffc] || msg.sender == owner,
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
  function () external payable {
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
  )
    public
    whenNotPaused
    returns (FriendsFingersCrowdsale)
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

    FriendsFingersCrowdsale ffc = new FriendsFingersCrowdsale(
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
      ffc.pause();
    }

    token.transferOwnership(address(ffc));

    addCrowdsaleToList(address(ffc));

    return ffc;
  }

  function restartCrowdsale(
    address _ffc,
    uint256 _cap,
    uint256 _openingTime,
    uint256 _closingTime,
    uint256 _rate,
    string _crowdsaleInfo
  )
    public
    whenNotPaused
    onlyOwnerOrCreator(_ffc)
    returns (FriendsFingersCrowdsale)
  {
    FriendsFingersCrowdsale ffc = FriendsFingersCrowdsale(_ffc);
    require(
      ffc.nextRoundId() == 0,
      "Can't restart twice"
    );
    require(
      ffc.goalReached(),
      "Can't restart if goal not reached"
    );
    require(
      _rate < ffc.rate(),
      "Can't restart if rate greater or equal old rate"
    );

    ffc.finalize();

    crowdsaleCount++;
    uint256 _round = ffc.round();
    _round++;

    FriendsFingersToken token = ffc.token();

    FriendsFingersCrowdsale newFfc = new FriendsFingersCrowdsale(
      crowdsaleCount,
      _cap,
      0,
      _openingTime,
      _closingTime,
      _rate,
      ffc.wallet(),
      token,
      _crowdsaleInfo,
      _round,
      ffc.id(),
      friendsFingersRatePerMille,
      friendsFingersWallet
    );

    token.transferOwnership(address(newFfc));

    ffc.setnextRoundId(crowdsaleCount);

    addCrowdsaleToList(address(newFfc));

    return newFfc;
  }

  function closeCrowdsale(address _ffc) public onlyOwnerOrCreator(_ffc) {
    FriendsFingersCrowdsale ffc = FriendsFingersCrowdsale(_ffc);
    ffc.finalize();

    FriendsFingersToken token = ffc.token();
    token.finishMinting();
    token.transferOwnership(crowdsaleCreators[_ffc]);

    emit CrowdsaleClosed(ffc);
  }

  function updateCrowdsaleInfo(
    address _ffc,
    string _crowdsaleInfo
  )
    public
    onlyOwnerOrCreator(_ffc)
  {
    FriendsFingersCrowdsale ffc = FriendsFingersCrowdsale(_ffc);
    ffc.updateCrowdsaleInfo(_crowdsaleInfo);
  }

  // Only builder owner methods

  function changeEnabledAddressStatus(
    address _address,
    bool _status
  )
    public
    onlyOwner
  {
    require(_address != address(0), "Can't enable the zero wallet");
    enabledAddresses[_address] = _status;
  }

  function setDefaultFriendsFingersRate(
    uint256 _newFriendsFingersRatePerMille
  )
    public
    onlyOwner
  {
    require(
      _newFriendsFingersRatePerMille > 0,
      "Can't set a value less or equal to zero"
    );
    require(
      _newFriendsFingersRatePerMille < friendsFingersRatePerMille,
      "Can't set a value greater than the previous"
    );
    friendsFingersRatePerMille = _newFriendsFingersRatePerMille;
  }

  function setMainWallet(address _newFriendsFingersWallet) public onlyOwner {
    require(
      _newFriendsFingersWallet != address(0),
      "Can't be set to the zero wallet"
    );
    friendsFingersWallet = _newFriendsFingersWallet;
  }

  function setFriendsFingersRateForCrowdsale(
    address _ffc,
    uint256 _newFriendsFingersRatePerMille
  )
    public
    onlyOwner
  {
    FriendsFingersCrowdsale ffc = FriendsFingersCrowdsale(_ffc);
    ffc.setFriendsFingersRate(_newFriendsFingersRatePerMille);
  }

  function setFriendsFingersWalletForCrowdsale(
    address _ffc,
    address _newFriendsFingersWallet
  )
    public
    onlyOwner
  {
    FriendsFingersCrowdsale ffc = FriendsFingersCrowdsale(_ffc);
    ffc.setFriendsFingersWallet(_newFriendsFingersWallet);
  }

  // Emergency methods (only builder owner or enabled addresses)

  function pauseCrowdsale(address _ffc) public onlyOwnerOrEnabledAddress {
    FriendsFingersCrowdsale ffc = FriendsFingersCrowdsale(_ffc);
    ffc.pause();
  }

  function unpauseCrowdsale(address _ffc) public onlyOwnerOrEnabledAddress {
    FriendsFingersCrowdsale ffc = FriendsFingersCrowdsale(_ffc);
    ffc.unpause();
  }

  function blockCrowdsale(address _ffc) public onlyOwnerOrEnabledAddress {
    FriendsFingersCrowdsale ffc = FriendsFingersCrowdsale(_ffc);
    ffc.blockCrowdsale();
  }

  function safeTokenWithdrawalFromCrowdsale(
    address _ffc,
    address _tokenAddress,
    uint256 _tokens
  )
    public
    onlyOwnerOrEnabledAddress
  {
    FriendsFingersCrowdsale ffc = FriendsFingersCrowdsale(_ffc);
    ffc.transferAnyERC20Token(_tokenAddress, _tokens, friendsFingersWallet);
  }

  function safeWithdrawalFromCrowdsale(
    address _ffc
  )
    public
    onlyOwnerOrEnabledAddress
  {
    FriendsFingersCrowdsale ffc = FriendsFingersCrowdsale(_ffc);
    ffc.safeWithdrawal();
  }

  function setExpiredAndWithdraw(
    address _ffc
  )
    public
    onlyOwnerOrEnabledAddress
  {
    FriendsFingersCrowdsale ffc = FriendsFingersCrowdsale(_ffc);
    ffc.setExpiredAndWithdraw();
  }

  // Internal methods

  function addCrowdsaleToList(address _ffc) internal {
    crowdsaleList[crowdsaleCount] = _ffc;
    crowdsaleCreators[_ffc] = msg.sender;

    emit CrowdsaleStarted(ffc);
  }

}
