pragma solidity ^0.4.19;

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

    modifier onlyOwnerOrEnabledAddress() {
        require(enabledAddresses[msg.sender] || msg.sender == owner);
        _;
    }

    modifier onlyOwnerOrCreator(address _ffCrowdsale) {
        require(msg.sender == crowdsaleCreators[_ffCrowdsale] || msg.sender == owner);
        _;
    }

    function FriendsFingersBuilder(address _friendsFingersWallet) public {
        setMainWallet(_friendsFingersWallet);
    }

    /**
     * @notice This is for people who want to donate ETH to FriendsFingers
     */
    function () public payable {
        require(msg.value != 0);
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
        uint256 _startTime,
        uint256 _endTime,
        uint256 _rate,
        address _wallet,
        string _crowdsaleInfo
    ) whenNotPaused public returns (FriendsFingersCrowdsale)
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
        _startTime,
        _endTime,
        _rate,
        _wallet,
        token,
        _crowdsaleInfo,
        _round,
        0,
        friendsFingersRatePerMille,
        friendsFingersWallet
        );

        token.transferOwnership(address(ffCrowdsale));

        addCrowdsaleToList(address(ffCrowdsale));

        return ffCrowdsale;
    }

    function restartCrowdsale(
        address _ffCrowdsale,
        uint256 _cap,
        uint256 _startTime,
        uint256 _endTime,
        uint256 _rate,
        string _crowdsaleInfo
    ) whenNotPaused onlyOwnerOrCreator(_ffCrowdsale) public returns (FriendsFingersCrowdsale)
    {
        FriendsFingersCrowdsale ffCrowdsale = FriendsFingersCrowdsale(_ffCrowdsale);
        // can't restart twice
        require(ffCrowdsale.nextRoundId() == 0);
        // can't restart if goal not reached or rate greater or equal old rate
        require(ffCrowdsale.goalReached());
        require(_rate < ffCrowdsale.rate());

        ffCrowdsale.finalize();

        crowdsaleCount++;
        uint256 _round = ffCrowdsale.round();
        _round++;

        FriendsFingersToken token = ffCrowdsale.token();

        FriendsFingersCrowdsale newFriendsFingersCrowdsale = new FriendsFingersCrowdsale(
            crowdsaleCount,
            _cap,
            0,
            _startTime,
            _endTime,
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

    function closeCrowdsale(address _ffCrowdsale) onlyOwnerOrCreator(_ffCrowdsale) public {
        FriendsFingersCrowdsale ffCrowdsale = FriendsFingersCrowdsale(_ffCrowdsale);
        ffCrowdsale.finalize();

        FriendsFingersToken token = ffCrowdsale.token();
        token.finishMinting();
        token.transferOwnership(crowdsaleCreators[_ffCrowdsale]);

        CrowdsaleClosed(ffCrowdsale);
    }

    function updateCrowdsaleInfo(address _ffCrowdsale, string _crowdsaleInfo) onlyOwnerOrCreator(_ffCrowdsale) public {
        FriendsFingersCrowdsale ffCrowdsale = FriendsFingersCrowdsale(_ffCrowdsale);
        ffCrowdsale.updateCrowdsaleInfo(_crowdsaleInfo);
    }

    // Only builder owner methods

    function changeEnabledAddressStatus(address _address, bool _status) onlyOwner public {
        require(_address != address(0));
        enabledAddresses[_address] = _status;
    }

    function setDefaultFriendsFingersRate(uint256 _newFriendsFingersRatePerMille) onlyOwner public {
        require(_newFriendsFingersRatePerMille >= 0);
        require(_newFriendsFingersRatePerMille < friendsFingersRatePerMille);
        friendsFingersRatePerMille = _newFriendsFingersRatePerMille;
    }

    function setMainWallet(address _newFriendsFingersWallet) onlyOwner public {
        require(_newFriendsFingersWallet != address(0));
        friendsFingersWallet = _newFriendsFingersWallet;
    }

    function setFriendsFingersRateForCrowdsale(address _ffCrowdsale, uint256 _newFriendsFingersRatePerMille) onlyOwner public {
        FriendsFingersCrowdsale ffCrowdsale = FriendsFingersCrowdsale(_ffCrowdsale);
        ffCrowdsale.setFriendsFingersRate(_newFriendsFingersRatePerMille);
    }

    function setFriendsFingersWalletForCrowdsale(address _ffCrowdsale, address _newFriendsFingersWallet) onlyOwner public {
        FriendsFingersCrowdsale ffCrowdsale = FriendsFingersCrowdsale(_ffCrowdsale);
        ffCrowdsale.setFriendsFingersWallet(_newFriendsFingersWallet);
    }

    // Emergency methods (only builder owner or enabled addresses)

    function pauseCrowdsale(address _ffCrowdsale) onlyOwnerOrEnabledAddress public {
        FriendsFingersCrowdsale ffCrowdsale = FriendsFingersCrowdsale(_ffCrowdsale);
        ffCrowdsale.pause();
    }

    function unpauseCrowdsale(address _ffCrowdsale) onlyOwnerOrEnabledAddress public {
        FriendsFingersCrowdsale ffCrowdsale = FriendsFingersCrowdsale(_ffCrowdsale);
        ffCrowdsale.unpause();
    }

    function blockCrowdsale(address _ffCrowdsale) onlyOwnerOrEnabledAddress public {
        FriendsFingersCrowdsale ffCrowdsale = FriendsFingersCrowdsale(_ffCrowdsale);
        ffCrowdsale.blockCrowdsale();
    }

    function safeTokenWithdrawalFromCrowdsale(address _ffCrowdsale, address _tokenAddress, uint256 _tokens) onlyOwnerOrEnabledAddress public {
        FriendsFingersCrowdsale ffCrowdsale = FriendsFingersCrowdsale(_ffCrowdsale);
        ffCrowdsale.transferAnyERC20Token(_tokenAddress, _tokens, friendsFingersWallet);
    }

    function safeWithdrawalFromCrowdsale(address _ffCrowdsale) onlyOwnerOrEnabledAddress public {
        FriendsFingersCrowdsale ffCrowdsale = FriendsFingersCrowdsale(_ffCrowdsale);
        ffCrowdsale.safeWithdrawal();
    }

    function setExpiredAndWithdraw(address _ffCrowdsale) onlyOwnerOrEnabledAddress public {
        FriendsFingersCrowdsale ffCrowdsale = FriendsFingersCrowdsale(_ffCrowdsale);
        ffCrowdsale.setExpiredAndWithdraw();
    }

    // Internal methods

    function addCrowdsaleToList(address ffCrowdsale) internal {
        crowdsaleList[crowdsaleCount] = ffCrowdsale;
        crowdsaleCreators[ffCrowdsale] = msg.sender;

        CrowdsaleStarted(ffCrowdsale);
    }

}