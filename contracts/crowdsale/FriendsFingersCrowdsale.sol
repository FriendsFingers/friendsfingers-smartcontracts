pragma solidity ^0.4.19;

import "zeppelin-solidity/contracts/lifecycle/Pausable.sol";
import "zeppelin-solidity/contracts/crowdsale/Crowdsale.sol";
import "zeppelin-solidity/contracts/crowdsale/CappedCrowdsale.sol";
import "zeppelin-solidity/contracts/crowdsale/FinalizableCrowdsale.sol";

import "./../token/FriendsFingersToken.sol";


/**
 * @title FriendsFingersCrowdsale
 */
contract FriendsFingersCrowdsale is CappedCrowdsale, FinalizableCrowdsale, Pausable, SafeContract {

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

    function FriendsFingersCrowdsale(
        uint256 _id,
        uint256 _cap,
        uint256 _goal,
        uint256 _startTime,
        uint256 _endTime,
        uint256 _rate,
        address _wallet,
        FriendsFingersToken _token,
        string _crowdsaleInfo,
        uint256 _round,
        uint256 _previousRoundId,
        uint256 _friendsFingersRatePerMille,
        address _friendsFingersWallet
    ) public
    CappedCrowdsale (_cap)
    FinalizableCrowdsale ()
    Crowdsale (_startTime, _endTime, _rate, _wallet)
    {
        require(_endTime <= _startTime + 30 days);
        require(_token != address(0));

        require(_round <= 5);
        if (_round == 1) {
            if (_id == 1) {
                require(_goal >= 0);
            } else {
                require(_goal > 0);
            }
        } else {
            require(_goal == 0);
        }
        require(_cap > 0);
        require(_cap >= _goal);

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
    function buyTokens(address beneficiary) whenNotPaused public payable {
        require(beneficiary != address(0));
        require(validPurchase());

        uint256 weiAmount = msg.value;

        // calculate token amount to be created
        uint256 tokens = getTokenAmount(weiAmount);

        // update state
        weiRaised = weiRaised.add(weiAmount);

        token.mint(beneficiary, tokens);
        TokenPurchase(
            msg.sender,
            beneficiary,
            weiAmount,
            tokens
        );

        forwardFunds();
    }

    // Public methods

    // if crowdsale is unsuccessful or blocked, investors can claim refunds here
    function claimRefund() whenNotPaused public {
        require(state == State.Refunding || state == State.Blocked);
        address investor = msg.sender;

        uint256 depositedValue = deposited[investor];
        deposited[investor] = 0;
        investor.transfer(depositedValue);
        Refunded(investor, depositedValue);
    }

    function finalize() whenNotPaused public {
        super.finalize();
    }

    // View methods

    function goalReached() view public returns (bool) {
        return weiRaised >= goal;
    }

    // Only owner methods

    function updateCrowdsaleInfo(string _crowdsaleInfo) onlyOwner public {
        require(!hasEnded());
        crowdsaleInfo = _crowdsaleInfo;
    }

    function blockCrowdsale() onlyOwner public {
        require(state == State.Active);
        state = State.Blocked;
    }

    function setnextRoundId(uint256 _nextRoundId) onlyOwner public {
        nextRoundId = _nextRoundId;
    }

    function setFriendsFingersRate(uint256 _newFriendsFingersRatePerMille) onlyOwner public {
        require(_newFriendsFingersRatePerMille >= 0);
        require(_newFriendsFingersRatePerMille <= friendsFingersRatePerMille);
        friendsFingersRatePerMille = _newFriendsFingersRatePerMille;
    }

    function setFriendsFingersWallet(address _friendsFingersWallet) onlyOwner public {
        require(_friendsFingersWallet != address(0));
        friendsFingersWallet = _friendsFingersWallet;
    }

    // Emergency methods

    function safeWithdrawal() onlyOwner public {
        require(now >= endTime + 1 years);
        friendsFingersWallet.transfer(this.balance);
    }

    function setExpiredAndWithdraw() onlyOwner public {
        require((state == State.Refunding || state == State.Blocked) && now >= endTime + 1 years);
        state = State.Expired;
        friendsFingersWallet.transfer(this.balance);
        Expired();
    }

    // Internal methods

    /**
     * @dev Create new instance of token contract
     */
    function createTokenContract() internal returns (MintableToken) {
        return MintableToken(address(0x0));
    }

    // overriding CappedCrowdsale#validPurchase to add extra cap logic
    // @return true if investors can buy at the moment
    function validPurchase() internal view returns (bool) {
        require(state == State.Active);
        return super.validPurchase();
    }

    // We're overriding the fund forwarding from Crowdsale.
    function forwardFunds() internal {
        if (deposited[msg.sender] == 0) {
            investorCount++;
        }
        deposited[msg.sender] = deposited[msg.sender].add(msg.value);
    }

    // vault finalization task, called when owner calls finalize()
    function finalization() internal {
        require(state == State.Active);

        if (friendsFingersRatePerMille > 0) {
            uint256 friendsFingersSupply = cap.mul(rate).mul(friendsFingersRatePerMille).div(1000);
            token.mint(owner, friendsFingersSupply);
        }

        if (goalReached()) {
            if (friendsFingersRatePerMille > 0) {
                uint256 friendsFingersFee = weiRaised.mul(friendsFingersRatePerMille).div(1000);
                friendsFingersWallet.transfer(friendsFingersFee);
            }

            state = State.Closed;
            Closed();
            wallet.transfer(this.balance);
        } else {
            state = State.Refunding;
            RefundsEnabled();
        }

        token.transferOwnership(owner);

        super.finalization();
    }

}