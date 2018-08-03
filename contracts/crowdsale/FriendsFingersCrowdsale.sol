pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/lifecycle/Pausable.sol";
// solium-disable-next-line max-len
import "openzeppelin-solidity/contracts/crowdsale/emission/MintedCrowdsale.sol";
// solium-disable-next-line max-len
import "openzeppelin-solidity/contracts/crowdsale/validation/CappedCrowdsale.sol";
// solium-disable-next-line max-len
import "openzeppelin-solidity/contracts/crowdsale/distribution/FinalizableCrowdsale.sol";

import "./../token/FriendsFingersToken.sol";


/**
 * @title FriendsFingersCrowdsale
 */
// solium-disable-next-line max-len
contract FriendsFingersCrowdsale is CappedCrowdsale, FinalizableCrowdsale, MintedCrowdsale, Pausable, SafeContract {

  enum State { Active, Refunding, Closed, Blocked, Expired }

  uint256 public id;
  uint256 public previousRoundId;
  uint256 public nextRoundId;

  // The token being sold
  FriendsFingersToken public token;

  // the round of crowdsale
  uint256 public round;

  // minimum amount of funds to be raised in weis
  uint256 public goal;

  string public crowdsaleInfo;

  uint256 public friendsFingersRatePerMille;
  address public friendsFingersWallet;

  uint256 public investorCount = 0;
  mapping (address => uint256) public deposited;
  State public state;

  event Closed();
  event Expired();
  event RefundsEnabled();
  event Refunded(address indexed beneficiary, uint256 weiAmount);

  constructor(
    uint256 _id,
    uint256 _cap,
    uint256 _goal,
    uint256 _openingTime,
    uint256 _closingTime,
    uint256 _rate,
    address _wallet,
    FriendsFingersToken _token,
    string _crowdsaleInfo,
    uint256 _round,
    uint256 _previousRoundId,
    uint256 _friendsFingersRatePerMille,
    address _friendsFingersWallet
  )
    public
    CappedCrowdsale (_cap)
    TimedCrowdsale (_openingTime, _closingTime)
    FinalizableCrowdsale ()
    Crowdsale (_rate, _wallet, _token)
  {
    require(
      _closingTime <= _openingTime + 30 days,
      "Crowdale must end in 30 days"
    );

    require(
      _round <= 5,
      "Can't restart more than 5 times"
    );

    if (_round == 1) {
      if (_id == 1) {
        require(
          _goal >= 0,
          "Goal must be greater or equal to zero"
        );
      } else {
        require(
          _goal > 0,
          "Goal must be greater than zero"
        );
      }
    } else {
      require(
        _goal == 0,
        "Goal must be equal to zero"
      );
    }
    require(
      _cap > 0,
      "Cap must be greater than zero"
    );
    require(
      _cap >= _goal,
      "Cap must be greater than goal"
    );

    goal = _goal;

    crowdsaleInfo = _crowdsaleInfo;

    token = _token;

    round = _round;
    previousRoundId = _previousRoundId;
    state = State.Active;

    id = _id;

    friendsFingersRatePerMille = _friendsFingersRatePerMille;
    friendsFingersWallet = _friendsFingersWallet;
  }

  // low level token purchase function
  function buyTokens(address _beneficiary) public whenNotPaused payable {
    uint256 weiAmount = msg.value;
    _preValidatePurchase(_beneficiary, weiAmount);

    // calculate token amount to be created
    uint256 tokens = _getTokenAmount(weiAmount);

    // update state
    weiRaised = weiRaised.add(weiAmount);

    super._processPurchase(_beneficiary, tokens);
    emit TokenPurchase(
      msg.sender,
      _beneficiary,
      weiAmount,
      tokens
    );

    _updatePurchasingState(_beneficiary, weiAmount);

    _forwardFunds();
    _postValidatePurchase(_beneficiary, weiAmount);
  }

  // Public methods

  // if crowdsale is unsuccessful or blocked, investors can claim refunds here
  function claimRefund() public whenNotPaused {
    require(
      state == State.Refunding || state == State.Blocked,
      "State must be Refunding or Blocked"
    );
    address investor = msg.sender;

    uint256 depositedValue = deposited[investor];
    deposited[investor] = 0;
    investor.transfer(depositedValue);
    emit Refunded(investor, depositedValue);
  }

  function finalize() public whenNotPaused {
    super.finalize();
  }

  // View methods

  function goalReached() public view returns (bool) {
    return weiRaised >= goal;
  }

  /**
   * @dev Checks whether the period in which the crowdsale is open has already elapsed or cap reached
   * @return Whether crowdsale period has elapsed
   */
  function hasClosed() public view returns (bool) {
    return capReached() || super.hasClosed();
  }

  // Only owner methods

  function updateCrowdsaleInfo(string _crowdsaleInfo) public onlyOwner {
    require(!hasClosed(), "Crowdsale must not to be closed");
    crowdsaleInfo = _crowdsaleInfo;
  }

  function blockCrowdsale() public onlyOwner {
    require(state == State.Active, "State must be Active");
    state = State.Blocked;
  }

  function setnextRoundId(uint256 _nextRoundId) public onlyOwner {
    nextRoundId = _nextRoundId;
  }

  function setFriendsFingersRate(
    uint256 _newFriendsFingersRatePerMille
  )
    public
    onlyOwner
  {
    require(
      _newFriendsFingersRatePerMille >= 0,
      "Can't set a value less than zero"
    );
    require(
      _newFriendsFingersRatePerMille <= friendsFingersRatePerMille,
      "Can't set a value greater than the previous"
    );
    friendsFingersRatePerMille = _newFriendsFingersRatePerMille;
  }

  function setFriendsFingersWallet(
    address _friendsFingersWallet
  )
    public
    onlyOwner
  {
    require(
      _friendsFingersWallet != address(0),
      "Can't be set to the zero wallet"
    );
    friendsFingersWallet = _friendsFingersWallet;
  }

  // Emergency methods

  function safeWithdrawal() public onlyOwner {
    // solium-disable-next-line security/no-block-members
    require(
      block.timestamp >= closingTime + 365 days, // solium-disable-line security/no-block-members
      "Can't safe withdraw before than a year after the end"
    );
    friendsFingersWallet.transfer(address(this).balance);
  }

  function setExpiredAndWithdraw() public onlyOwner {
    // solium-disable-next-line security/no-block-members
    require(
      block.timestamp >= closingTime + 365 days, // solium-disable-line security/no-block-members
      "Can't withdraw before than a year after the end"
    );
    require(
      state == State.Refunding || state == State.Blocked,
      "Can't withdraw when Refunding or Blocked"
    );
    state = State.Expired;
    friendsFingersWallet.transfer(address(this).balance);
    emit Expired();
  }

  // Internal methods

  // overriding CappedCrowdsale#_preValidatePurchase to add extra cap logic
  // @return true if investors can buy at the moment
  function _preValidatePurchase(
    address _beneficiary,
    uint256 _weiAmount
  )
    internal
  {
    require(state == State.Active, "State must be Active");
    super._preValidatePurchase(_beneficiary, _weiAmount);
  }

  // We're overriding the fund forwarding from Crowdsale.
  function _forwardFunds() internal {
    if (deposited[msg.sender] == 0) {
      investorCount++;
    }
    deposited[msg.sender] = deposited[msg.sender].add(msg.value);
  }

  // vault finalization task, called when owner calls finalize()
  function finalization() internal {
    require(state == State.Active, "State must be Active");

    if (goalReached()) {
      state = State.Closed;
      emit Closed();

      if (friendsFingersRatePerMille > 0) {
        uint256 friendsFingersFee = weiRaised.mul(friendsFingersRatePerMille).div(1000);
        friendsFingersWallet.transfer(friendsFingersFee);
      }

      wallet.transfer(address(this).balance);
    } else {
      state = State.Refunding;
      emit RefundsEnabled();
    }

    if (friendsFingersRatePerMille > 0) {
      uint256 friendsFingersSupply = cap.mul(rate).mul(friendsFingersRatePerMille).div(1000);
      token.mint(owner, friendsFingersSupply);
    }

    token.transferOwnership(owner);

    super.finalization();
  }

}
